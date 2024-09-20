import datasette from './datasette.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import JSON5 from 'json5' // need to use this as spec is written with single quotes. need to pass this onto data designers team to fix
import performanceDbApi from './performanceDbApi.js'

async function getColumnSummary (dataset, lpa) {
  const sql = `select * from column_field_summary
    where resource != ''
    and pipeline = '${dataset}'
    AND organisation = '${lpa}'
    limit 1000`

  const { formattedData } = await datasette.runQuery(sql, 'performance')

  return formattedData
}

async function getFieldStats (lpa, dataset) {
  const columnSummary = await datasetService.getColumnSummary(dataset, lpa)
  const specifications = await datasetService.getSpecifications()
  if (!(dataset in specifications)) {
    logger.warn(`services/datasetService.getFieldStats(): cannot find specification for dataset: ${dataset}`, { type: types.app, dataset })
    return null
  }

  const datasetSpecification = specifications[dataset]

  const matchingFields = columnSummary[0].matching_field.split(',')
  const nonMatchingFields = columnSummary[0].non_matching_field.split(',')
  const allFields = [...matchingFields, ...nonMatchingFields]

  const numberOfFieldsSupplied = datasetSpecification.fields.map(field => field.field).reduce((acc, current) => {
    return allFields.includes(current) ? acc + 1 : acc
  }, 0)

  const numberOfFieldsMatched = datasetSpecification.fields.map(field => field.field).reduce((acc, current) => {
    return matchingFields.includes(current) ? acc + 1 : acc
  }, 0)

  const numberOfExpectedFields = datasetSpecification.fields.length

  return {
    numberOfFieldsSupplied,
    numberOfFieldsMatched,
    numberOfExpectedFields
  }
}

async function getSpecifications () {
  const sql = 'select * from specification order by specification'
  const result = await datasette.runQuery(sql)

  const resultWithParsedJson = result.formattedData.filter(dataset => dataset.datasets !== '').map((dataset) => {
    const { json, ...rest } = dataset
    const formattedJson = JSON5.parse(json)
    return {
      ...rest,
      json: formattedJson
    }
  })

  const specifications = resultWithParsedJson.reduce((accumulator, current) => {
    current.json.forEach((spec) => {
      accumulator[spec.dataset] = spec
    })
    return accumulator
  }, {})

  return specifications
}

export async function getSources (lpa, dataset) {
  const sql = `
    select rhe.endpoint, rhe.endpoint_url, rhe.status, rhe.exception, rhe.resource, rhe.latest_log_entry_date, rhe.endpoint_entry_date, rhe.endpoint_end_date, rhe.resource_start_date, rhe.resource_end_date, s.documentation_url
    from reporting_historic_endpoints rhe
    LEFT JOIN source s ON rhe.endpoint = s.endpoint
    where REPLACE(rhe.organisation, '-eng', '') = '${lpa}' and rhe.pipeline = '${dataset}'
    AND (rhe.resource_end_date >= current_timestamp OR rhe.resource_end_date is null)
  `

  const { formattedData } = await datasette.runQuery(sql)

  return formattedData
}

export async function getDatasetStats ({ dataset, lpa, organisation }) {
  const stats = await datasetService.getFieldStats(lpa, dataset)

  const sources = await datasetService.getSources(lpa, dataset)

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

  const numberOfRecords = await performanceDbApi.getEntityCount(organisation.entity, dataset)

  return {
    numberOfFieldsSupplied: stats?.numberOfFieldsSupplied ?? 0,
    numberOfFieldsMatched: stats?.numberOfFieldsMatched ?? 0,
    numberOfExpectedFields: stats?.numberOfExpectedFields ?? 0,
    numberOfRecords,
    endpoints
  }
}

export const datasetService = {
  getColumnSummary,
  getFieldStats,
  getSpecifications,
  getSources,
  getDatasetStats
}
