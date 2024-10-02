import { fetchDatasetInfo, fetchEntityCount, fetchLatestResource, fetchLpaDatasetIssues, fetchOrgInfo, fetchSpecification, isResourceAccessible, isResourceIdInParams, logPageError, pullOutDatasetSpecification, takeResourceIdFromParams } from './common.middleware.js'
import { fetchIf, fetchMany, parallel, renderTemplate, FetchOptions } from './middleware.builders.js'
import { fetchResourceStatus } from './datasetTaskList.middleware.js'

const fetchColumnSummary = fetchMany({
  query: ({ params }) => `select * from endpoint_dataset_resource_summary
    where resource != ''
    and pipeline = '${params.dataset}'
    AND organisation = '${params.lpa}'
    limit 1000`,
  result: 'columnSummary',
  dataset: FetchOptions.performanceDb
})

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

export const prepareDatasetOverviewTemplateParams = (req, res, next) => {
  const { orgInfo, specification, columnSummary, entityCount, sources, dataset } = req

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
  parallel([
    fetchOrgInfo,
    fetchDatasetInfo
  ]),
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
