import { fetchDatasetInfo, fetchEntityIssueCounts, fetchEntryIssueCounts, fetchOrgInfo, fetchResources, getDatasetTaskListError, logPageError, pullOutDatasetSpecification } from './common.middleware.js'
import { fetchOne, fetchMany, renderTemplate, FetchOptions, FetchOneFallbackPolicy, onlyIf } from './middleware.builders.js'
import { getDeadlineHistory, requiredDatasets } from '../utils/utils.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { prepareDatasetTaskListErrorTemplateParams } from './datasetTaskList.middleware.js'

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
  result: 'specification'
})

// const fetchSources = fetchMany({
//   query: ({ params }) => `
//     WITH RankedEndpoints AS (
//       SELECT
//         rhe.endpoint,
//         rhe.endpoint_url,
//         rhe.status,
//         rhe.exception,
//         rhe.resource,
//         rhe.latest_log_entry_date,
//         rhe.endpoint_entry_date,
//         rhe.endpoint_end_date,
//         rhe.resource_start_date as resource_start_date,
//         rhe.resource_end_date,
//         s.documentation_url,
//         ROW_NUMBER() OVER (
//           PARTITION BY rhe.endpoint_url
//           ORDER BY
//             rhe.latest_log_entry_date DESC
//         ) AS row_num
//       FROM
//         reporting_historic_endpoints rhe
//         LEFT JOIN source s ON rhe.endpoint = s.endpoint
//       WHERE
//         REPLACE(rhe.organisation, '-eng', '') = '${params.lpa}'
//         AND rhe.pipeline = '${params.dataset}'
//         AND (
//           rhe.resource_end_date >= current_timestamp
//           OR rhe.resource_end_date IS NULL
//           OR rhe.resource_end_date = ''
//         )
//         AND (
//           rhe.endpoint_end_date >= current_timestamp
//           OR rhe.endpoint_end_date IS NULL
//           OR rhe.endpoint_end_date = ''
//         )
//     )
//     SELECT
//       endpoint,
//       endpoint_url,
//       status,
//       exception,
//       resource,
//       latest_log_entry_date,
//       endpoint_entry_date,
//       endpoint_end_date,
//       resource_start_date,
//       resource_end_date,
//       documentation_url
//     FROM
//       RankedEndpoints
//     WHERE
//       row_num = 1
//     ORDER BY
//       latest_log_entry_date DESC;
//   `,
//   result: 'sources'
// })

/**
 * Sets notices from a source key in the request object.
 *
 * @param {string} sourceKey The key in the request object that contains the source data.
 * @returns {function} A middleware function that sets notices based on the source data.
 */
export const setNoticesFromSourceKey = (sourceKey) => (req, res, next) => {
  const { dataset } = req.params
  const resources = req[sourceKey]

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

    const startDate = new Date(source.start_date)

    if (startDate.toString() === 'Invalid Date') {
      logger.warn('Invalid start date encountered', {
        type: types.DataValidation,
        startDate: source.startDate
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

export const prepareDatasetOverviewTemplateParams = (req, res, next) => {
  const { orgInfo, datasetSpecification, columnSummary, entityCount, resources, dataset, entryIssueCounts, entityIssueCounts, notice } = req

  const mappingFields = columnSummary[0]?.mapping_field?.split(';') ?? []
  const nonMappingFields = columnSummary[0]?.non_mapping_field?.split(';') ?? []
  const allFields = [...mappingFields, ...nonMappingFields]

  const specFields = datasetSpecification ? datasetSpecification.fields : []
  const numberOfFieldsSupplied = specFields.reduce((acc, field) => {
    return allFields.includes(field.field) ? acc + 1 : acc
  }, 0)
  const numberOfFieldsMatched = specFields.reduce((acc, field) => {
    return mappingFields.includes(field.field) ? acc + 1 : acc
  }, 0)

  const numberOfExpectedFields = specFields.length

  // I'm pretty sure every endpoint has a separate documentation-url, but this isn't currently represented in the performance db. need to double check this and update if so
  const endpoints = resources.sort((a, b) => {
    if (a.status >= 200 && a.status < 300) return -1
    if (b.status >= 200 && b.status < 300) return 1
    return 0
  }).map((source, index) => {
    let error

    if (parseInt(source.status) < 200 || parseInt(source.status) >= 300) {
      error = {
        code: parseInt(source.status),
        exception: source.exception
      }
    }

    return {
      name: `Data Url ${index}`,
      endpoint: source.endpoint_url,
      documentation_url: source.documentation_url,
      lastAccessed: source.latest_log_entry_date,
      lastUpdated: source.resource_start_date, // as in: when was the _resource_ updated, not data under that resource
      error
    }
  })

  req.templateParams = {
    organisation: orgInfo,
    dataset,
    taskCount: entryIssueCounts.length + entityIssueCounts.length,
    stats: {
      numberOfFieldsSupplied: numberOfFieldsSupplied ?? 0,
      numberOfFieldsMatched: numberOfFieldsMatched ?? 0,
      numberOfExpectedFields: numberOfExpectedFields ?? 0,
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

const noResourceAccessible = (req, res, next) => req.resources.length === 0

export default [
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchColumnSummary,
  fetchResources,
  fetchEntityIssueCounts,
  fetchEntryIssueCounts,
  onlyIf(noResourceAccessible, prepareDatasetTaskListErrorTemplateParams),
  onlyIf(noResourceAccessible, getDatasetTaskListError),
  fetchSpecification,
  pullOutDatasetSpecification,
  setNoticesFromSourceKey('resources'),
  fetchEntityCount,
  prepareDatasetOverviewTemplateParams,
  getDatasetOverview,
  logPageError
]
