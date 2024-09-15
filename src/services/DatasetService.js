import datasette from './datasette.js'

export async function getLatestDatasetResourcesForLpa (dataset, lpa) {
  const sql = `
    SELECT rle.resource, rle.status, rle.endpoint, rle.endpoint_url, rle.status, rle.days_since_200, rle.exception
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
      select
        fr.rowid,
        fr.end_date,
        fr.fact,
        fr.entry_date,
        fr.entry_number,
        fr.resource,
        fr.start_date,
        ft.entity,
        ft.field,
        ft.entry_date,
        ft.start_date,
        ft.value
      from
        fact_resource fr
        left join fact ft on fr.fact = ft.fact
      where
        fr.resource = '${resourceId}'
        AND ft.field = 'geometry'
      order by
        fr.rowid`

  const { formattedData } = await datasette.runQuery(sql, dataset)

  return formattedData
}

export async function getLatestDatasetGeometryEntriesForLpa (dataset, lpa) {
  const { resource } = await getLatestDatasetResourcesForLpa(dataset, lpa)

  return getGeometryEntriesForResourceId(dataset, resource)
}
