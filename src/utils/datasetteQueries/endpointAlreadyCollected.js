import datasette from '../../services/datasette.js'

function sqlString (value) {
  return String(value).replaceAll("'", "''")
}

export async function endpointAlreadyCollectedForDataset ({ endpointUrl, dataset }) {
  if (!endpointUrl || !dataset) return false

  const sql = /* sql */ `
    SELECT 1
    FROM endpoint e
    JOIN resource_endpoint re ON e.endpoint = re.endpoint
    JOIN resource r ON re.resource = r.resource
    JOIN resource_dataset rd ON r.resource = rd.resource
    WHERE e.endpoint_url = '${sqlString(endpointUrl)}'
      AND rd.dataset = '${sqlString(dataset)}'
      AND (e.end_date IS NULL OR e.end_date = '')
      AND (r.end_date IS NULL OR r.end_date = '')
    LIMIT 1`

  const response = await datasette.runQuery(sql)
  return response.formattedData.length > 0
}
