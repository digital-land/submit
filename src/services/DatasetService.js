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

/*
  Needs to get:
    - Number of records
    - Number of fields supplied
    - Number of fields matched
    - Licence
    - source documentation url
    - for each data url
      - the endpoint
      - last accessed
      - last updated
      - any access errors

*/
async function getDatasetStatsForResourceId (dataset, resourceId) {
  const sql = `
    SELECT 'numberOfRecords' AS metric, COUNT(*) AS value
    FROM
      (
        SELECT
          *
        FROM
          fact_resource fr
        WHERE
          fr.resource = '${resourceId}'
        GROUP BY
          entry_number
      )
    UNION ALL
    SELECT 'numberOfFieldsSupplied' AS metric, COUNT(*) AS value
    FROM
    (
      SELECT
        *
      FROM
        fact_resource fr
      WHERE
        fr.resource = '${resourceId}'
    )`

  const { formattedData } = await datasette.runQuery(sql, dataset)

  return formattedData
}

// async function getColumnSummary (dataset, lpa) {
//   const sql = `select * from column_field_summary
//     where resource != ''
//     and pipeline = '${dataset}'
//     AND organisation = '${lpa}'
//     limit 1000`

//   const { formattedData } = await datasette.runQuery(sql, 'performance')

//   return formattedData
// }

export async function getDatasetStats (dataset, lpa) {
  try {
    const stats = {}
    const { resource: resourceId } = await performanceDbApi.getLatestResource(lpa, dataset)
    // const columnSummary = await getColumnSummary(dataset, lpa)

    const metrics = await getDatasetStatsForResourceId(dataset, resourceId)

    metrics.forEach(({ metric, value }) => {
      stats[metric] = value
    })

    return stats
  } catch (error) {
    logger.warn(
      `DatasetService.getDatasetStats(): Error getting dataset stats for ${lpa} in ${dataset}`,
      {
        errorMessage: error.message,
        errorStack: error.stack
      }
    )

    return {}
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
