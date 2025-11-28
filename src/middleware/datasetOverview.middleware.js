/**
 * @module middleware-dataset-overview
 *
 * @description Middleware for dataset overview page (under /oranisations/:lpa/:dataset/overview)
 */

import { fetchDatasetPlatformInfo, fetchEntityIssueCounts, fetchEntryIssueCounts, fetchOrgInfo, fetchResources, fetchSources, logPageError, pullOutDatasetSpecification, expectationFetcher, expectations, noop, prepareAuthority } from './common.middleware.js'
import { fetchOne, fetchMany, renderTemplate, FetchOptions, FetchOneFallbackPolicy } from './middleware.builders.js'
import { getDeadlineHistory, requiredDatasets } from '../utils/utils.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { isFeatureEnabled } from '../utils/features.js'

const fetchColumnSummary = fetchMany({
  query: ({ params }) => `
    SELECT
      edrs.*
    FROM
      endpoint_dataset_resource_summary edrs
      INNER JOIN (
        SELECT
          endpoint,
          dataset,
          organisation,
          end_date as endpoint_end_date
        FROM
          endpoint_dataset_summary
        WHERE
          end_date = ''
      ) as t1 on t1.endpoint = edrs.endpoint
      AND replace(t1.organisation, '-eng', '') = edrs.organisation
      AND t1.dataset = edrs.dataset
    WHERE
    edrs.resource != ''
    AND edrs.pipeline = '${params.dataset}'
    AND edrs.organisation = '${params.lpa}'
    limit 1000`,
  result: 'columnSummary',
  dataset: FetchOptions.performanceDb
})

const fetchSpecification = fetchOne({
  query: ({ req }) => `select * from specification WHERE specification = '${req.dataset.collection}'`,
  result: 'specification',
  fallbackPolicy: FetchOneFallbackPolicy['set-empty-object']
})

const fetchOutOfBoundsExpectations = expectationFetcher({
  expectation: expectations.entitiesOutOfBounds,
  result: 'expectationOutOfBounds'
})

/**
 * Sets notices from a source key in the request object.
 *
 * @param {string} sourceKey The key in the request object that contains the source data.
 * @returns {function} A middleware function that sets notices based on the source data.
 */
export const setNoticesFromSourceKey = (sourceKey) => (req, res, next) => {
  const { dataset } = req.params
  const resources = req[sourceKey]

  if (!resources) {
    logger.warn('No resources provided to set notices.', {
      type: types.DataValidation
    })
    return next()
  }

  const source = resources[0]

  const deadlineObj = requiredDatasets.find(deadline => deadline.dataset === dataset)

  if (deadlineObj) {
    const noticePeriod = typeof deadlineObj.noticePeriod === 'string' ? parseInt(deadlineObj.noticePeriod, 10) : deadlineObj.noticePeriod

    if (Number.isNaN(noticePeriod) || typeof noticePeriod !== 'number') {
      logger.warn('Invalid notice period configuration.', {
        type: types.DataValidation
      })
      return next()
    }

    const currentDate = new Date()
    let datasetSuppliedForCurrentYear = false
    let datasetSuppliedForLastYear = false

    const { deadlineDate, lastYearDeadline, twoYearsAgoDeadline } = getDeadlineHistory(deadlineObj.deadline)

    const startDate = source ? new Date(source.start_date) : undefined

    if (!startDate || startDate.toString() === 'Invalid Date') {
      logger.warn('Invalid start date encountered', {
        type: types.DataValidation,
        startDate: source?.startDate
      })
      return next()
    }

    datasetSuppliedForCurrentYear = startDate >= lastYearDeadline && startDate < deadlineDate
    datasetSuppliedForLastYear = startDate >= twoYearsAgoDeadline && startDate < lastYearDeadline

    const warningDate = new Date(deadlineDate.getTime())
    warningDate.setMonth(warningDate.getMonth() - noticePeriod)

    const dueNotice = !datasetSuppliedForCurrentYear && currentDate > warningDate
    const overdueNotice = !dueNotice && !datasetSuppliedForCurrentYear && !datasetSuppliedForLastYear

    if (dueNotice || overdueNotice) {
      const deadline = deadlineDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })

      let type
      if (dueNotice) {
        type = 'due'
      } else if (overdueNotice) {
        type = 'overdue'
      }

      req.notice = {
        deadline,
        type
      }
    }
  }

  next()
}

export const fetchEntityCount = fetchOne({
  query: ({ req }) => `
    select count(entity) as entity_count
    from entity
    WHERE organisation_entity = '${req.orgInfo.entity}'
  `,
  result: 'entityCount',
  dataset: FetchOptions.fromParams,
  fallbackPolicy: FetchOneFallbackPolicy.continue
})

/**
 * @typedef {Object} OrgInfo
 * @property {string} entity - Organization entity ID
 */

/**
 * @typedef {Object} Source
 * @property {string} id - Source ID
 * @property {number|undefined} status
 * @property {string} endpoint
 * @property {string} endpoint_url
 * @property {string} documentation_url
 * @property {Object|undefined} latest_log_entry_date
 * @property {Object|undefined} resource_start_date
 * @property {String|undefined} exception
 */

/**
 * @typedef {Object} Issue
 * @property {string} type - Issue type
 */

/**
 * Prepare template parameters for dataset overview
 *
 * @param {Object} req - Request object
 * @param {OrgInfo} req.orgInfo - Organization info
 * @param {Object} req.dataset - dataset info
 * @param {Source[]} req.sources - Sources array
 * @param {Object} req.datasetSpecification - dataset specification
 * @param {Object[]} req.columnSummary
 * @param {Object} req.entityCount
 * @param {Object[]} [req.entryIssueCounts]
 * @param {Object[]} [req.entityIssueCounts]
 * @param {Issue[]} [req.issues] - Optional issues array
 * @param {Object} req.notice
 * @param {Object[]} [req.expectationOutOfBounds]
 * @param {string} req.expectationOutOfBounds[].dataset
 * @param {boolean} req.expectationOutOfBounds[].passed - did the exepectation pass
 * @param {Object} [req.templateParams] OUT parameter
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const prepareDatasetOverviewTemplateParams = (req, res, next) => {
  const { orgInfo, entityCount, sources, dataset, entryIssueCounts, entityIssueCounts, notice, authority, expectationOutOfBounds = [] } = req

  let endpointErrorIssues = 0
  const endpoints = sources
    .sort((a, b) => new Date(b.endpoint_entry_date) - new Date(a.endpoint_entry_date))
    .map((source, index) => {
      let error

      if (!source.status || source.status < 200 || source.status >= 300) {
        error = {
          code: source.status,
          exception: source.exception
        }
        endpointErrorIssues += 1
      }

      return {
        name: `Endpoint URL ${index}`,
        endpoint: source.endpoint,
        endpoint_url: source.endpoint_url,
        documentation_url: source.documentation_url,
        lastAccessed: source.latest_log_entry_date,
        lastUpdated: source.resource_start_date, // as in: when was the _resource_ updated, not data under that resource
        entryDate: source.endpoint_entry_date,
        error
      }
    })

  // Hard code task count for 'some' authority
  let taskCount = 0
  if (authority === 'some') {
    taskCount = 1
  } else {
    taskCount = (entryIssueCounts ? entryIssueCounts.length : 0) +
    (entityIssueCounts ? entityIssueCounts.length : 0) +
    endpointErrorIssues +
    (expectationOutOfBounds.length > 0 ? 1 : 0)
  }

  const showMap = !!((dataset.typology && dataset.typology.toLowerCase() === 'geography'))

  req.templateParams = {
    authority,
    showMap,
    organisation: orgInfo,
    dataset,
    taskCount,
    stats: {
      numberOfRecords: entityCount.entity_count,
      endpoints
    },
    notice
  }

  next()
}

const getDatasetOverview = renderTemplate(
  {
    templateParams: (req) => req.templateParams,
    template: 'organisations/dataset-overview.html',
    handlerName: 'datasetOverview'
  }
)

export default [
  fetchOrgInfo,
  fetchDatasetPlatformInfo,
  fetchColumnSummary,
  fetchResources,
  fetchSources,
  fetchEntityIssueCounts,
  fetchEntryIssueCounts,
  fetchSpecification,
  isFeatureEnabled('expectationOutOfBoundsTask') ? fetchOutOfBoundsExpectations : noop,
  prepareAuthority, // Determine authority or non authority page, using platform API direclty so breaks the fetch design pattern.
  pullOutDatasetSpecification,
  // setNoticesFromSourceKey('resources'), // commented out as the logic is currently incorrect (https://github.com/digital-land/submit/issues/824)
  fetchEntityCount,
  prepareDatasetOverviewTemplateParams,
  getDatasetOverview,
  logPageError
]
