import datasette from './datasette.js'
import logger from '../utils/logger.js'
import performanceDbApi from './performanceDbApi.js'

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

export async function getDatasetStats (dataset, lpa) {
  try {
    const stats = {}
    const { resource: resourceId } = await performanceDbApi.getLatestResource(lpa, dataset)
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
