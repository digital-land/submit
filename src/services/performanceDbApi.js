/**
 * Performance DB API service
 */
import datasette from './datasette.js'

/**
 * @typedef {object} Dataset
 * @property {string} endpoint
 * @property {?string} error
 * @property {?string} issue
 */

/**
 * @typedef {object} LpaOverview
 * @property {string} name
 * @property {{ [dataset: string]: Dataset }} datasets
 */

/**
 * Performance DB API service
 * @export
 * @default
 */
export default {
  /**
   * Get LPA overview
   * @param {string} lpa - LPA ID
   * @returns {Promise<LpaOverview>} LPA overview
   */
  getLpaOverview: async (lpa) => {
    const query = `
    SELECT
    p.organisation,
    o.name,
    p.dataset,
    rle.pipeline,
    rle.endpoint,
    rle.resource,
    rle.exception,
    rle.status as http_status,
    case 
           when (rle.status != '200') then 'Error'
           when (it.severity = 'error') then 'Issue'
           when (it.severity = 'warning') then 'Warning'
           else 'No issues'
           end as status,
    case
            when (it.severity = 'info') then ''
            else i.issue_type
        end as issue_type,
        case
            when (it.severity = 'info') then ''
            else it.severity
        end as severity,
        it.responsibility,
        COUNT(
            case
            when it.severity != 'info' then 1
            else null
            end
        ) as issue_count
FROM
    provision p
LEFT JOIN
    organisation o ON o.organisation = p.organisation
LEFT JOIN
    reporting_latest_endpoints rle
    ON REPLACE(rle.organisation, '-eng', '') = p.organisation
    AND rle.pipeline = p.dataset
LEFT JOIN
    issue i ON rle.resource = i.resource AND rle.pipeline = i.dataset
LEFT JOIN
    issue_type it ON i.issue_type = it.issue_type AND it.severity != 'info'
WHERE
    p.organisation = '${lpa}'
GROUP BY
    p.organisation,
    p.dataset,
    o.name,
    rle.pipeline,
    rle.endpoint
ORDER BY
    p.organisation,
    o.name;
`

    const result = await datasette.runQuery(query)

    // convert the rows into an easier to access format
    const columns = result.columns
    const rows = result.rows.map((row) => {
      return row.reduce((acc, val, index) => {
        acc[columns[index]] = val
        return acc
      }, {})
    })

    const datasets = rows.reduce((accumulator, row) => {
      let error
      if (row.http_status !== '200' || row.exception !== '') {
        error = row.exception !== '' ? row.exception : `endpoint returned with a status of ${row.http_status}`
      }

      let issue
      if (row.issue_count > 0) {
        issue = `There are ${row.issue_count} issues in this dataset`
      }

      accumulator[row.dataset] = {
        endpoint: row.endpoint,
        error,
        issue
      }
      return accumulator
    }, {})

    return {
      name: result.rows[0][1],
      datasets
    }
  }
}
