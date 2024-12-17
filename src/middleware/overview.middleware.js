import performanceDbApi from '../services/performanceDbApi.js'
import { fetchOrgInfo, logPageError, fetchEndpointSummary, fetchEntityIssueCounts, fetchEntryIssueCounts, fetchResources } from './common.middleware.js'
import { fetchMany, FetchOptions, renderTemplate, fetchOneFromAllDatasets } from './middleware.builders.js'
import { dataSubjects, getDeadlineHistory, requiredDatasets } from '../utils/utils.js'
import config from '../../config/index.js'
import _ from 'lodash'
import logger from '../utils/logger.js'

// get a list of available datasets
const availableDatasets = Object.values(dataSubjects).flatMap((dataSubject) =>
  dataSubject.dataSets
    .filter((dataset) => dataset.available)
    .map((dataset) => dataset.value)
)

/**
 * Middleware. Updates req with 'datasetErrorStatus'.
 *
 * Fetches datasets which have active endpoints in error state.
 */
const fetchDatasetErrorStatus = fetchMany({
  query: ({ params }) => {
    return performanceDbApi.datasetErrorStatusQuery(params.lpa, { datasetsFilter: Object.keys(config.datasetsConfig) })
  },
  result: 'datasetErrorStatus',
  dataset: FetchOptions.performanceDb
})

const fetchProvisions = fetchMany({
  query: ({ params }) => {
    const excludeDatasets = Object.keys(config.datasetsConfig).map(dataset => `'${dataset}'`).join(',')
    return /* sql */ `select dataset, project, provision_reason 
       from provision where organisation = '${params.lpa}' and dataset in (${excludeDatasets})`
  },
  result: 'provisions'
})

const fetchEntityCounts = fetchOneFromAllDatasets({
  query: ({ req }) => `
    select count(entity) as entity_count
    from entity
    WHERE organisation_entity = '${req.orgInfo.entity}'`,
  result: 'entityCounts'
})

/**
 * Calculates overall "health" of the datasets (not)provided by an organisation.
 *
 * @param {[number, number, number]} accumulator
 * @param {{ endpoint?: string, status: string }} dataset
 * @returns
 */
const orgStatsReducer = (accumulator, dataset) => {
  if (dataset.endpointCount > 0) accumulator[0]++
  if (dataset.status === 'Needs fixing') accumulator[1]++
  if (dataset.status === 'Error') accumulator[2]++
  return accumulator
}

/**
 * Dataset submission deadline check middleware.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 *
 * @description
 * This middleware function checks if a dataset has been submitted within a certain timeframe
 * and sets flags for due and overdue notices accordingly.
 */
export const datasetSubmissionDeadlineCheck = (req, res, next) => {
  const { resources } = req
  const currentDate = new Date()

  if (!resources) {
    const error = new Error('datasetSubmissionDeadlineCheck requires resources')
    next(error)
  }

  req.noticeFlags = requiredDatasets.map(dataset => {
    const datasetResources = resources[dataset.dataset]
    let resource = datasetResources?.find(resource => resource.dataset === dataset.dataset)

    let datasetSuppliedForCurrentYear = false
    let datasetSuppliedForLastYear = false

    const { deadlineDate, lastYearDeadline, twoYearsAgoDeadline } = getDeadlineHistory(dataset.deadline)

    if (!deadlineDate || !lastYearDeadline || !twoYearsAgoDeadline) {
      logger.error(`Invalid deadline dates for dataset: ${dataset.dataset}`)
      return { dataset: dataset.dataset, dueNotice: false, overdueNotice: false, deadline: undefined }
    }

    if (resource) {
      const startDate = new Date(resource.start_date)

      if (!startDate || Number.isNaN(startDate.getTime())) {
        logger.error(`Invalid start date for resource: ${dataset.dataset}`)
        return { dataset: dataset.dataset, dueNotice: false, overdueNotice: false, deadline: undefined }
      }

      datasetSuppliedForCurrentYear = startDate >= lastYearDeadline && startDate < deadlineDate
      datasetSuppliedForLastYear = startDate >= twoYearsAgoDeadline && startDate < lastYearDeadline
    } else {
      resource = { dataset: dataset.dataset }
    }

    const warningDate = new Date(deadlineDate.getTime())
    warningDate.setMonth(warningDate.getMonth() - dataset.noticePeriod)

    const dueNotice = !datasetSuppliedForCurrentYear && currentDate > warningDate
    const overdueNotice = !dueNotice && !datasetSuppliedForCurrentYear && !datasetSuppliedForLastYear

    return { dataset: dataset.dataset, dueNotice, overdueNotice, deadline: deadlineDate }
  })

  next()
}

export function groupResourcesByDataset (req, res, next) {
  const { resources } = req

  req.resources = resources.reduce((acc, current) => {
    if (!acc[current.dataset]) {
      acc[current.dataset] = []
    }
    acc[current.dataset].push(current)
    return acc
  }, {})

  next()
}

/**
 * Adds notices to datasets based on notice flags
 *
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function in the middleware chain
 *
 * @description
 * This middleware function adds notices to datasets based on the notice flags.
 * It modifies the `req.datasets` and `req.notices` properties.
 */
export const addNoticesToDatasets = (req, res, next) => {
  const { noticeFlags, datasets } = req

  if (!Array.isArray(noticeFlags) || !Array.isArray(datasets)) {
    logger.error('Invalid noticeFlags or datasets structure')
    next()
  }

  req.datasets = datasets.map(dataset => {
    const notice = noticeFlags.find(notice => notice.dataset === dataset.dataset)

    if (!notice || (!notice.dueNotice && !notice.overdueNotice)) {
      return dataset
    }

    if (!(notice.deadline instanceof Date) || Number.isNaN(notice.deadline.getTime())) {
      logger.error(`Invalid deadline for dataset: ${dataset.dataset}`)
      return dataset
    }

    const deadline = notice.deadline.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    let type
    if (notice.dueNotice) {
      type = 'due'
    } else if (notice.overdueNotice) {
      type = 'overdue'
    }

    return {
      ...dataset,
      notice: {
        deadline,
        type
      }
    }
  })

  next()
}

export function prepareDatasetObjects (req, res, next) {
  const { issues, endpoints } = req

  req.datasets = availableDatasets.map((dataset) => {
    const datasetEndpoints = endpoints[dataset]
    const datasetIssues = issues[dataset]

    if (!datasetEndpoints) {
      return { status: 'Not submitted', endpointCount: 0, dataset }
    }

    const endpointCount = datasetEndpoints.length
    const httpStatus = datasetEndpoints.find(endpoint => endpoint.latest_status !== '200')?.latest_status
    const error = httpStatus !== undefined ? `There was a ${httpStatus} error accessing the data URL` : undefined
    const issueCount = datasetIssues?.length || 0

    let status
    if (error) {
      status = 'Error'
    } else if (issueCount > 0) {
      status = 'Needs fixing'
    } else {
      status = 'Live'
    }

    return { dataset, error, issueCount, status, endpointCount }
  })

  next()
}

/**
 *
 * @param {{ provisions: { dataset: string, provision_reason: string, project: string }[], lpaOverview: Object, orgInfo: Object }} req
 * @param res
 * @param next
 */
export function prepareOverviewTemplateParams (req, res, next) {
  const { orgInfo: organisation, provisions, datasets } = req
  // add in any of the missing key 8 datasets
  const keys = new Set(datasets.map(d => d.dataset))
  availableDatasets.forEach((dataset) => {
    if (!keys.has(dataset)) {
      const row = {
        dataset,
        endpoint: null,
        status: 'Not submitted',
        issue_count: 0,
        entity_count: undefined
      }
      datasets.push(row)
    }
  })

  const provisionData = new Map()
  for (const provision of provisions ?? []) {
    provisionData.set(provision.dataset, provision)
  }

  const totalDatasets = datasets.length
  const [datasetsWithEndpoints, datasetsWithIssues, datasetsWithErrors] = datasets.reduce(orgStatsReducer, [0, 0, 0])

  const datasetsByReason = _.groupBy(datasets, (ds) => {
    const reason = provisionData.get(ds.dataset)?.provision_reason
    switch (reason) {
      case 'statutory':
        return 'statutory'
      default:
        return 'other'
    }
  })

  for (const coll of Object.values(datasetsByReason)) {
    coll.sort((a, b) => a.dataset.localeCompare(b.dataset))
  }

  req.templateParams = {
    organisation,
    datasets: datasetsByReason,
    totalDatasets,
    datasetsWithEndpoints,
    datasetsWithIssues,
    datasetsWithErrors
  }

  next()
}

export const getOverview = renderTemplate({
  templateParams (req) {
    if (!req.templateParams) throw new Error('missing templateParams')
    return req.templateParams
  },
  template: 'organisations/overview.html',
  handlerName: 'getOverview'
})

export function groupIssuesCountsByDataset (req, res, next) {
  const { entityIssueCounts, entryIssueCounts } = req

  // merge arrays and handle undefined
  const issueCounts = [...(entityIssueCounts || []), ...(entryIssueCounts || [])]
  req.issues = issueCounts.reduce((acc, current) => {
    if (!acc[current.dataset]) {
      acc[current.dataset] = []
    }
    acc[current.dataset].push(current)
    return acc
  }, {})

  next()
}

export function groupEndpointsByDataset (req, res, next) {
  const { endpoints } = req

  // merge arrays and handle undefined
  req.endpoints = endpoints.reduce((acc, current) => {
    if (!acc[current.dataset]) {
      acc[current.dataset] = []
    }
    acc[current.dataset].push(current)
    return acc
  }, {})

  next()
}

export default [
  fetchOrgInfo,
  fetchResources,
  fetchDatasetErrorStatus,
  fetchEndpointSummary,
  fetchEntityIssueCounts,
  fetchEntryIssueCounts,
  fetchEntityCounts,
  groupResourcesByDataset,
  groupIssuesCountsByDataset,
  groupEndpointsByDataset,

  prepareDatasetObjects,

  datasetSubmissionDeadlineCheck,
  addNoticesToDatasets,
  fetchProvisions,
  prepareOverviewTemplateParams,
  getOverview,
  logPageError
]
