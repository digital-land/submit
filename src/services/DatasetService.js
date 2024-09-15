import datasette from './datasette.js'
import logger from '../utils/logger.js'

export async function getLatestDatasetResourceForLpa (dataset, lpa) {
  const sql = `
    SELECT rle.resource
    FROM reporting_latest_endpoints rle
    LEFT JOIN resource_organisation ro ON rle.resource = ro.resource
    LEFT JOIN organisation o ON REPLACE(ro.organisation, '-eng', '') = o.organisation
    WHERE REPLACE(ro.organisation, '-eng', '') = '${lpa}'
    AND rle.pipeline = '${dataset}'`

  const resources = await datasette.runQuery(sql)

  return resources?.formattedData[0]
}

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
    const { resource } = await getLatestDatasetResourceForLpa(dataset, lpa)

    return getGeometryEntriesForResourceId(dataset, resource)
  } catch (error) {
    logger.error(`Error getting geometry entries for ${lpa} in ${dataset}`, error)

    return []
  }
}
