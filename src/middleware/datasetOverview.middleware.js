import { fetchDatasetInfo, fetchLatestResource, fetchLpaDatasetIssues, fetchOrgInfo, isResourceAccessible, isResourceIdInParams, logPageError, takeResourceIdFromParams } from './common.middleware.js'
import { fetchOne, fetchIf, fetchMany, parallel, renderTemplate, FetchOptions } from './middleware.builders.js'
import { fetchResourceStatus } from './datasetTaskList.middleware.js'
import performanceDbApi from '../services/performanceDbApi.js'

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

export const pullOutDatasetSpecification = (req, res, next) => {
  const { specification } = req
  const collectionSpecifications = JSON.parse(specification.json)
  const datasetSpecification = collectionSpecifications.find((spec) => spec.dataset === req.dataset.dataset)
  req.specification = datasetSpecification
  next()
}

const fetchSources = fetchMany({
  query: ({ params }) => `
    select rhe.endpoint, rhe.endpoint_url, rhe.status, rhe.exception, rhe.resource, rhe.latest_log_entry_date, rhe.endpoint_entry_date, rhe.endpoint_end_date, rhe.resource_start_date, rhe.resource_end_date, s.documentation_url
    from reporting_historic_endpoints rhe
    LEFT JOIN source s ON rhe.endpoint = s.endpoint
    where REPLACE(rhe.organisation, '-eng', '') = '${params.lpa}' and rhe.pipeline = '${params.dataset}'
    AND (rhe.resource_end_date >= current_timestamp OR rhe.resource_end_date is null)
  `,
  result: 'sources'
})

const fetchEntityCount = fetchOne({
  query: ({ req }) => performanceDbApi.entityCountQuery(req.orgInfo.entity),
  result: 'entityCount',
  dataset: FetchOptions.fromParams
})

export const prepareDatasetOverviewTemplateParams = (req, res, next) => {
  const { orgInfo, specification, columnSummary, entityCount, sources, dataset, issues } = req

  const mappingFields = columnSummary[0].mapping_field?.split(';') ?? []
  const nonMappingFields = columnSummary[0].non_mapping_field?.split(';') ?? []
  const allFields = [...mappingFields, ...nonMappingFields]

  const numberOfFieldsSupplied = specification.fields.map(field => field.field).reduce((acc, current) => {
    return allFields.includes(current) ? acc + 1 : acc
  }, 0)

  const numberOfFieldsMatched = specification.fields.map(field => field.field).reduce((acc, current) => {
    return mappingFields.includes(current) ? acc + 1 : acc
  }, 0)

  const numberOfExpectedFields = specification.fields.length

  // I'm pretty sure every endpoint has a separate documentation-url, but this isn't currently represented in the performance db. need to double check this and update if so
  const endpoints = sources.sort((a, b) => {
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
      lastUpdated: source.endpoint_entry_date, // not sure if this is the lastupdated
      error
    }
  })

  req.templateParams = {
    organisation: orgInfo,
    dataset,
    issueCount: issues.length ?? 0,
    stats: {
      numberOfFieldsSupplied: numberOfFieldsSupplied ?? 0,
      numberOfFieldsMatched: numberOfFieldsMatched ?? 0,
      numberOfExpectedFields: numberOfExpectedFields ?? 0,
      numberOfRecords: entityCount.entity_count,
      endpoints
    }
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
  fetchDatasetInfo,
  parallel([
    fetchColumnSummary,
    fetchResourceStatus,
    fetchIf(isResourceIdInParams, fetchLatestResource, takeResourceIdFromParams)
  ]),
  fetchIf(isResourceAccessible, fetchLpaDatasetIssues),
  fetchSpecification,
  pullOutDatasetSpecification,
  fetchSources,
  fetchEntityCount,
  prepareDatasetOverviewTemplateParams,
  getDatasetOverview,
  logPageError
]
