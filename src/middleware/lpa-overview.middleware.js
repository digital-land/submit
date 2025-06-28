/**
 * @module middleware-lpa-overview
 *
 * @description Middleware for oragnisation (LPA) overview page
 */

import performanceDbApi from '../services/performanceDbApi.js'
import { expectationFetcher, expectations, fetchEndpointSummary, fetchEntityIssueCounts, fetchEntryIssueCounts, fetchOrgInfo, fetchResources, logPageError, noop, setAvailableDatasets } from './common.middleware.js'
import { fetchMany, FetchOptions, renderTemplate, fetchOneFromAllDatasets } from './middleware.builders.js'
import { getDeadlineHistory, requiredDatasets } from '../utils/utils.js'
import config from '../../config/index.js'
import _ from 'lodash'
import logger from '../utils/logger.js'
import { isFeatureEnabled } from '../utils/features.js'

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
 * @param {number[]} accumulator - Array containing counts [withEndpoints, needsFixing, hasErrors]
 * @param {Object} dataset - Dataset information
 * @param {string} [dataset.endpoint] - Optional endpoint URL
 * @param {string} dataset.status - Dataset status
 * @param {number} dataset.endpointCount - Number of endpoints
 * @returns {number[]} Updated accumulator
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
/**
 * Updates req.datasets objects with endpoint status and error information.
 *
 * @param {Object} req
 * @param {Object} req.issues
 * @param {Object} req.endpoints
 * @param {Object[]} [req.expectationOutOfBounds]
 * @param {string} req.expectationOutOfBounds[].dataset
 * @param {boolean} req.expectationOutOfBounds[].passed - did the exepectation pass
 * @param {string[]} req.availableDatasets
 * @param {Object[]} [req.datasets] OUT param
 * @param {*} res
 * @param {*} next
 */
export function prepareDatasetObjects (req, res, next) {
  const { issues, endpoints, expectationOutOfBounds, availableDatasets } = req
  const outOfBoundsViolations = new Set((expectationOutOfBounds ?? []).map(o => o.dataset))
  req.datasets = availableDatasets.map((dataset) => {
    const datasetEndpoints = endpoints[dataset]
    const datasetIssues = issues[dataset]

    if (!datasetEndpoints) {
      return { status: 'Not submitted', endpointCount: 0, dataset }
    }

    const endpointCount = datasetEndpoints.length
    // const httpStatus = datasetEndpoints.find(endpoint => endpoint.latest_status !== '200')?.latest_status
    // const error = httpStatus !== undefined ? `There was a ${httpStatus} error accessing the endpoint URL` : undefined
    const allError = datasetEndpoints.every(endpoint => endpoint.latest_status !== '200')
    const httpStatus = allError ? datasetEndpoints[0]?.latest_status : undefined
    const error = httpStatus !== undefined ? `There was a ${httpStatus} error accessing the endpoint URL` : undefined
    const expectationFailed = outOfBoundsViolations.has(dataset)
    const issueCount = (datasetIssues?.length || 0) + (expectationFailed ? 1 : 0)

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
 * Prepares overview template parameters.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.orgInfo - Organization information
 * @param {string[]} req.availableDatasets list of available datasets
 * @param {Object[]} [req.provisions] - Array of provision objects
 * @param {string} req.provisions[].dataset - Dataset name
 * @param {string} req.provisions[].provision_reason - Reason for provision
 * @param {string} req.provisions[].project - Project name
 * @param {Object[]} req.datasets - Array of dataset objects
 * @param {Object} [req.templateParams] OUT parameter
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
export function prepareOverviewTemplateParams (req, res, next) {
  const { orgInfo: organisation, provisions, datasets, availableDatasets } = req

  const provisionData = new Map()
  for (const provision of provisions ?? []) {
    provisionData.set(provision.dataset, provision)
  }

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

  const isODPMember = provisions.findIndex((p) => p.project === 'open-digital-planning') >= 0

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
    datasetsWithErrors,
    isODPMember
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

const fetchOutOfBoundsExpectations = expectationFetcher({
  expectation: expectations.entitiesOutOfBounds,
  result: 'expectationOutOfBounds'
})
/**
 * Organisation (LPA) overview page middleware chain.
 */
export default [
  fetchOrgInfo,
  fetchResources,
  fetchDatasetErrorStatus,
  fetchEndpointSummary,
  fetchEntityIssueCounts,
  fetchEntryIssueCounts,
  fetchEntityCounts,
  setAvailableDatasets,
  isFeatureEnabled('expectationOutOfBoundsTask') ? fetchOutOfBoundsExpectations : noop,
  groupResourcesByDataset,
  groupIssuesCountsByDataset,
  groupEndpointsByDataset,

  prepareDatasetObjects,

  // datasetSubmissionDeadlineCheck,  // commented out as the logic is currently incorrect (https://github.com/digital-land/submit/issues/824)
  // addNoticesToDatasets,            // commented out as the logic is currently incorrect (https://github.com/digital-land/submit/issues/824)
  fetchProvisions,
  prepareOverviewTemplateParams,
  getOverview,
  logPageError
]
