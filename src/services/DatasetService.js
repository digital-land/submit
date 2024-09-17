import datasette from './datasette.js'
import logger from '../utils/logger.js'
import performanceDbApi from './performanceDbApi.js'
import Papa from 'papaparse'
import JSON5 from 'json5' // need to use this as spec is written with single quotes. need to pass this onto data designers team to fix

export async function getGeometryEntriesForResourceId (dataset, resourceId) {
  const sql = `
      SELECT ft.field, ft.value
      FROM fact_resource fr
      LEFT JOIN fact ft ON fr.fact = ft.fact
      WHERE fr.resource = '${resourceId}'
      AND ft.field = 'geometry'`

  const { formattedData } = await datasette.runQuery(sql, dataset)

  return formattedData
}

export async function getLatestDatasetGeometryEntriesForLpa (dataset, lpa) {
  try {
    const { resource: resourceId } = await performanceDbApi.getLatestResource(lpa, dataset)

    return getGeometryEntriesForResourceId(dataset, resourceId)
  } catch (error) {
    logger.warn(
      `DatasetService.getLatestDatasetGeometryEntriesForLpa(): Error getting geometry entries for ${lpa} in ${dataset}`,
      {
        errorMessage: error.message,
        errorStack: error.stack
      }
    )

    return []
  }
}

async function getColumnSummary (dataset, lpa) {
  const sql = `select * from column_field_summary
    where resource != ''
    and pipeline = '${dataset}'
    AND organisation = '${lpa}'
    limit 1000`

  const { formattedData } = await datasette.runQuery(sql, 'performance')

  return formattedData
}

export async function getFieldStats (lpa, dataset) {
  const columnSummary = await getColumnSummary(dataset, lpa)
  const specifications = await getSpecifications()
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

  const NumberOfExpectedFields = datasetSpecification.fields.length

  return {
    numberOfFieldsSupplied,
    numberOfFieldsMatched,
    NumberOfExpectedFields
  }
}

export async function getSpecifications () {
  try {
    const response = await fetch('https://raw.githubusercontent.com/digital-land/specification/main/specification/specification.csv')

    const csvData = await response.text()

    const initalParse = Papa.parse(csvData, { header: true })

    const fullyParsed = initalParse.data.filter(dataset => dataset.datasets !== '').map((dataset) => {
      const { json, ...rest } = dataset
      const formattedJson = JSON5.parse(json)
      return {
        ...rest,
        json: formattedJson
      }
    })

    const specifications = fullyParsed.reduce((accumulator, current) => {
      const datasets = current.datasets.split(';')
      datasets.forEach((dataset, index) => {
        accumulator[dataset] = current.json[index]
      })
      return accumulator
    }, {})

    return specifications
  } catch (error) {
    console.error(error)
  }
}

export async function getSources (lpa, dataset) {
  const sql = `
    select endpoint, endpoint_url, status, exception, resource, latest_log_entry_date, endpoint_entry_date, endpoint_end_date, resource_start_date, resource_end_date
    from reporting_historic_endpoints 
    where REPLACE(organisation, '-eng', '') = '${lpa}' and pipeline = '${dataset}'
    AND (resource_end_date >= current_timestamp OR resource_end_date is null)
  `

  const { formattedData } = await datasette.runQuery(sql, 'performance')

  return formattedData
}
