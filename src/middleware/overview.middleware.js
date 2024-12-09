import performanceDbApi, { lpaOverviewQuery } from '../services/performanceDbApi.js'
import { fetchOrgInfo, logPageError } from './common.middleware.js'
import { fetchMany, FetchOptions, handleRejections, renderTemplate } from './middleware.builders.js'
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
 * Middleware. Updates req with 'lpaOverview'
 *
 * Relies on {@link config}.
 *
 * @param {{ params: { lpa: string }, entityCounts: { dataset: string, resource: string, entityCount?: number }[]}} req
 */
const fetchLpaOverview = fetchMany({
  query: ({ req, params }) => {
    return lpaOverviewQuery(params.lpa, { datasetsFilter: Object.keys(config.datasetsConfig), entityCounts: req.entityCounts })
  },
  dataset: FetchOptions.performanceDb,
  result: 'lpaOverview'
})

const fetchLatestResources = fetchMany({
  query: ({ params }) => {
    return performanceDbApi.latestResourcesQuery(params.lpa, { datasetsFilter: Object.keys(config.datasetsConfig) })
  },
  result: 'resourceLookup',
  dataset: FetchOptions.performanceDb
})

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

/**
 * Updates req with `entityCounts` (of shape `{ resource, dataset}|{ resource, dataset, entityCount }`)
 *
 * @param {{ resourceLookup: {resource: string, dataset: string}[] }} req
 * @param {*} res
 * @param {*} next
 */
const fetchEntityCounts = async (req, res, next) => {
  const { resourceLookup } = req

  req.entityCounts = await performanceDbApi.getEntityCounts(resourceLookup)
  next()
}

/**
 * For the purpose of displaying single status label on (possibly) many issues,
 * we want issues with 'worse' status to be weighted higher.
 */
const statusOrdering = new Map(['Live', 'Needs fixing', 'Error', 'Not submitted'].map((status, i) => [status, i]))

/**
 * Calculates overall "health" of the datasets (not)provided by an organisation.
 *
 * @param {[number, number, number]} accumulator
 * @param {{ endpoint?: string, status: string }} dataset
 * @returns
 */
const orgStatsReducer = (accumulator, dataset) => {
  if (dataset.endpoint) accumulator[0]++
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
  const { resourceLookup } = req
  const currentDate = new Date()

  req.noticeFlags = requiredDatasets.map(dataset => {
    let resource = resourceLookup.find(resource => resource.dataset === dataset.dataset)

    let datasetSuppliedForCurrentYear = false
    let datasetSuppliedForLastYear = false

    const { deadlineDate, lastYearDeadline, twoYearsAgoDeadline } = getDeadlineHistory(dataset.deadline)

    if (!deadlineDate || !lastYearDeadline || !twoYearsAgoDeadline) {
      logger.error(`Invalid deadline dates for dataset: ${dataset.dataset}`)
      return { dataset: dataset.dataset, dueNotice: false, overdueNotice: false, deadline: undefined }
    }

    if (resource) {
      const startDate = new Date(resource.startDate)

      if (!resource.startDate || Number.isNaN(startDate.getTime())) {
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

/**
 * The overview data can contain multiple rows per dataset,
 * and we want a collection of one item per dataset,
 * because that's how we display it on the page.
 *
 * @param {object[]} lpaOverview
 * @returns {object[]}
 */
export function aggregateOverviewData (req, res, next) {
  const { lpaOverview } = req
  if (!Array.isArray(lpaOverview)) {
    throw new Error('lpaOverview should be an array')
  }
  const grouped = _.groupBy(lpaOverview, 'dataset')
  const datasets = []
  for (const [dataset, rows] of Object.entries(grouped)) {
    let numIssues = 0
    for (const row of rows) {
      if (row.status !== 'Needs fixing') {
        continue
      }
      if (row.issue_count) {
        const numFields = (row.fields ?? '').split(',').length
        if (row.issue_count >= row.entity_count) numIssues += numFields
        else numIssues += row.issue_count
      }
    }
    const info = {
      dataset,
      issue_count: numIssues,
      endpoint: rows[0].endpoint,
      error: rows[0].error,
      status: _.maxBy(rows, row => statusOrdering.get(row.status)).status
    }
    datasets.push(info)
  }

  requiredDatasets.forEach(requiredDataset => {
    const hasDataset = datasets.findIndex(dataset => dataset.dataset === requiredDataset.dataset) >= 0
    if (!hasDataset) {
      datasets.push({
        dataset: requiredDataset.dataset,
        status: 'Not submitted'
      })
    }
  })

  req.datasets = datasets
  next()
}

/**
 *
 * @param {{ provisions: { dataset: string, provision_reason: string, project: string }[], lpaOverview: Object, orgInfo: Object }} req
 * @param res
 * @param next
 */
export function prepareOverviewTemplateParams (req, res, next) {
  const { orgInfo: organisation, provisions, datasets, datasetErrorStatus } = req
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

  // we patch the datasets' project (based on provision data) and status (based on its endpoints error status)
  const datasetsWithEndpointErrors = new Set(datasetErrorStatus.map(item => item.dataset))
  for (const dataset of datasets) {
    dataset.project = provisionData.get(dataset.dataset)?.project
    if (dataset.status !== 'Error' && datasetsWithEndpointErrors.has(dataset.dataset)) {
      dataset.status = 'Error'
    }
  }

  const totalDatasets = datasets.length
  const [datasetsWithEndpoints, datasetsWithIssues, datasetsWithErrors] =
      datasets.reduce(orgStatsReducer, [0, 0, 0])

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

export default [
  fetchOrgInfo,
  fetchLatestResources,
  fetchDatasetErrorStatus,
  handleRejections(fetchEntityCounts),
  fetchLpaOverview,
  aggregateOverviewData,
  datasetSubmissionDeadlineCheck,
  addNoticesToDatasets,
  fetchProvisions,
  prepareOverviewTemplateParams,
  getOverview,
  logPageError
]
