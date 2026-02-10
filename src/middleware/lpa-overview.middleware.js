/**
 * @module middleware-lpa-overview
 *
 * @description Middleware for oragnisation (LPA) overview page
 */

import { expectationFetcher, expectations, fetchEndpointSummary, fetchOrgInfo, logPageError, noop, setAvailableDatasets, fetchEntityIssueCountsPerformanceDb } from './common.middleware.js'
import { fetchMany, renderTemplate, parallel } from './middleware.builders.js'
import { getDeadlineHistory, requiredDatasets } from '../utils/utils.js'
import _ from 'lodash'
import logger from '../utils/logger.js'
import { isFeatureEnabled } from '../utils/features.js'
import platformApi from '../services/platformApi.js'
import { types } from '../utils/logging.js'
import config from '../../config/index.js'

const fetchProvisions = fetchMany({
  query: ({ params }) => {
    return /* sql */ `select dataset, project, provision_reason
       from provision where organisation = '${params.lpa}'`
  },
  result: 'provisions'
})

/**
 * Calculates overall "health" of the datasets (not)provided by an organisation.
 *
 * @param {number[]} accumulator - Array containing counts [withEndpoints, needsFixing, hasErrors]
 * @param {Object} dataset - Dataset information
 * @param {string} [dataset.endpoint] - Optional endpoint URL
 * @param {string} dataset.status - Dataset status
 * @param {number} dataset.endpointCount - Number of endpoints
 * @param {number} dataset.endpointErrorCount - Number of endpoints with error
 * @param {number} dataset.issueCount - Number of issues
 * @returns {number[]} Updated accumulator
 */
const orgStatsReducer = (accumulator, dataset) => {
  if (dataset.endpointCount > 0) accumulator[0]++
  if (dataset.status === 'Needs improving') accumulator[1]++
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
 *
 * Does not work and not used currently, TODO: fix or delete
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

// TODO: Not used, fix or delete
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
  const { issues, endpoints, expectationOutOfBounds, availableDatasets, datasetAuthority } = req
  const outOfBoundsViolations = new Set((expectationOutOfBounds ?? []).map(o => o.dataset))
  req.datasets = availableDatasets.map((dataset) => {
    const datasetEndpoints = endpoints[dataset]
    const datasetIssues = issues[dataset]

    // If data found is provided by alternative source, Needs improving is 'hard coded in' as 1 task Needs improving: submit authoritive data
    if (datasetAuthority && datasetAuthority[dataset] === 'some') {
      return { status: 'Needs improving', endpointCount: 0, dataset, issueCount: 1, authority: 'some' }
    }

    if (!datasetEndpoints) {
      return { status: 'Not submitted', endpointCount: 0, dataset }
    }

    const endpointCount = datasetEndpoints.length
    const endpointErrorCount = datasetEndpoints.filter(endpoint => endpoint.latest_status !== '200').length
    const allError = datasetEndpoints.every(endpoint => endpoint.latest_status !== '200')
    const someError = datasetEndpoints.some(endpoint => endpoint.latest_status !== '200')
    const httpStatus = allError ? datasetEndpoints[0]?.latest_status : undefined
    const error = allError ? `There was a ${httpStatus} error accessing the endpoint URL` : undefined
    const expectationFailed = outOfBoundsViolations.has(dataset)
    const issueCount = (datasetIssues?.length || 0) + (expectationFailed ? 1 : 0)

    let status
    if (allError) {
      status = 'Error'
    } else if (someError || issueCount > 0) {
      status = 'Needs improving'
    } else {
      status = 'Live'
    }

    const authority = datasetAuthority?.[dataset] || ''

    return { dataset, error, issueCount, status, endpointCount, endpointErrorCount, authority }
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
      case 'expected':
        return 'expected'
      case 'prospective':
        return 'prospective'
      case 'encouraged': // Currently adding encouraged datasets to same group as prospective the "can-provide" segment
        return 'prospective'
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

/**
 * Batch version of prepareAuthority for LPA overview dashboard
 * Checks authority status for all datasets in parallel
 *
 * @param {Object} req - Request object
 * @param {Object} req.orgInfo - Organization info with entity
 * @param {Object} req.datasets - Object with dataset keys and their data
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export const prepareAuthorityBatch = async (req, res, next) => {
  // Initialize with empty object to prevent downstream failures
  req.datasetAuthority = {}

  try {
    const { orgInfo, availableDatasets } = req

    // Datasets that are currently enabled for authority checking i.e. local plans
    const authorityEnabledDatasets = [
      'local-plan-boundary',
      'local-plan-document',
      'local-plan-document-type',
      'local-plan-event',
      'local-plan-housing',
      'local-plan-process',
      'local-plan-timetable'
    ]
    let datasetsToCheck = []
    if (config.features.nonAuthPages.enabled) {
      // Use when all datasets are to be checked
      datasetsToCheck = availableDatasets
    } else {
      datasetsToCheck = availableDatasets.filter(dataset =>
        authorityEnabledDatasets.includes(dataset)
      )
    }

    if (datasetsToCheck.length === 0) {
      return next()
    }

    // Create parallel promises for all datasets
    const authorityPromises = datasetsToCheck.map(async (dataset) => {
      try {
        // Check for authoritative quality
        const authoritativeResult = await platformApi.fetchEntities({
          organisation_entity: orgInfo.entity,
          dataset,
          quality: 'authoritative',
          limit: 1
        })

        if (authoritativeResult.formattedData && authoritativeResult.formattedData.length > 0) {
          return { dataset, authority: 'authoritative' }
        }

        // Check for 'some' quality
        const someResult = await platformApi.fetchEntities({
          organisation_entity: orgInfo.entity,
          dataset,
          quality: 'some',
          limit: 1
        })

        if (someResult.formattedData && someResult.formattedData.length > 0) {
          return { dataset, authority: 'some' }
        }

        return { dataset, authority: '' }
      } catch (error) {
        logger.warn({
          message: `prepareAuthorityBatch failed for dataset ${dataset}: ${error.message}`,
          type: types.App,
          orgEntity: orgInfo.entity,
          dataset
        })
        return { dataset, authority: '' }
      }
    })

    // Wait for all authority checks
    const results = await Promise.all(authorityPromises)

    // Convert results array to dictionary for easier lookup
    req.datasetAuthority = results.reduce((acc, { dataset, authority }) => {
      acc[dataset] = authority
      return acc
    }, {})

    return next()
  } catch (error) {
    logger.error({
      message: `prepareAuthorityBatch failed: ${error.message}`,
      type: types.App,
      orgEntity: req.orgInfo?.entity,
      errorStack: error.stack
    })
    // req.datasetAuthority already initialized to {} at the top so okay future use
    return next()
  }
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
  const { entityIssueCounts = [] } = req

  req.issues = entityIssueCounts.reduce((acc, current) => {
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
  parallel([
    fetchEndpointSummary,
    fetchEntityIssueCountsPerformanceDb,
    fetchProvisions
  ]),

  setAvailableDatasets,
  isFeatureEnabled('expectationOutOfBoundsTask') ? fetchOutOfBoundsExpectations : noop,
  groupIssuesCountsByDataset,
  groupEndpointsByDataset,

  prepareAuthorityBatch, // Fetch Platform API authority status for all datasets
  prepareDatasetObjects,

  // datasetSubmissionDeadlineCheck,  // commented out as the logic is currently incorrect (https://github.com/digital-land/submit/issues/824)
  // addNoticesToDatasets,            // commented out as the logic is currently incorrect (https://github.com/digital-land/submit/issues/824)
  prepareOverviewTemplateParams,
  getOverview,
  logPageError
]
