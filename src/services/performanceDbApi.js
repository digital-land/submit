/**
 * Performance DB API service
 */
import datasette from './datasette.js'

// ===========================================

// for now we are using a csv for these messages but we will probably end up moving to a table, so for now this can sit in the fake performance db api

import csv from 'csv-parser' // ToDo: remember to remove this from package.json when we move away from csv
import fs from 'fs'

const messages = {}

fs.createReadStream('src/content/fieldIssueMessages.csv')
  .pipe(csv())
  .on('data', (row) => {
    messages[row.issue_type] = {
      singular: row.singular_message,
      plural: row.plural_message.replace('{num_issues}', '{}')
    }
  })
  .on('end', () => {
    // Messages object is now populated
  })

fs.createReadStream('src/content/entityIssueMessages.csv')
  .pipe(csv())
  .on('data', (row) => {
    messages[row.issue_type] = {
      ...messages[row.issue_type],
      entities_singular: row.singular_message.replace('{num_entities}', '{}'),
      entities_plural: row.plural_message.replace('{num_entities}', '{}')
    }
  })
  .on('end', () => {
    // Messages object is now populated
  })

function getStatusTag (status) {
  const statusToTagClass = {
    Error: 'govuk-tag--red',
    'Needs fixing': 'govuk-tag--yellow',
    Warning: 'govuk-tag--blue',
    Issue: 'govuk-tag--blue'
  }

  return {
    tag: {
      text: status,
      classes: statusToTagClass[status]
    }
  }
}

// ===========================================

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

    const datasets = result.formattedData.reduce((accumulator, row) => {
      let error
      if (row.http_status !== '200' || row.exception) {
        error = row.exception ? row.exception : `endpoint returned with a status of ${row.http_status}`
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
      name: result.formattedData[0].name,
      organisation: result.formattedData[0].organisation,
      datasets
    }
  },

  getLpaDatasetIssues: async (lpa, datasetId) => {
    const sql = `
      SELECT
        rle.endpoint,
        rle.resource,
        rle.exception,

        i.field,
        i.issue_type,
        i.line_number,
        i.value,
        i.message,

        CASE
          WHEN COUNT(
            CASE
              WHEN it.severity == 'error' THEN 1
              ELSE null
            END
          ) > 0 THEN 'Needs fixing'
          ELSE 'Live'
        END AS status,
        COUNT(i.issue_type) as num_issues
      FROM
          provision p
      LEFT JOIN
          reporting_latest_endpoints rle
          ON REPLACE(rle.organisation, '-eng', '') = p.organisation
          AND rle.pipeline = p.dataset
      LEFT JOIN
          issue i ON rle.resource = i.resource AND rle.pipeline = i.dataset
      LEFT JOIN
          issue_type it ON i.issue_type = it.issue_type
      WHERE
          p.organisation = '${lpa}' AND p.dataset = '${datasetId}'
          AND (it.severity == 'error' OR it.severity == 'warning')
      GROUP BY i.issue_type
      ORDER BY it.severity`

    const result = await datasette.runQuery(sql)
    return result.formattedData.map((row) => {
      return {
        num_issues: row.num_issues,
        issue_type: row.issue_type,
        resource: row.resource,
        status: row.status
      }
    })
  },

  getTaskList: (issues) => {
    return issues.map((issue) => {
      return {
        title: {
          text: this.getTaskMessage(issue.issue_type, issue.num_issues)
        },
        href: 'toDo',
        status: getStatusTag(issue.status)
      }
    })
  },

  getTaskMessage (issueType, issueCount, entityLevel = false) {
    if (!messages[issueType]) {
      throw new Error(`Unknown issue type: ${issueType}`)
    }

    let message
    if (entityLevel) {
      message = issueCount === 1 ? messages[issueType].entities_singular : messages[issueType].entities_plural
    } else {
      message = issueCount === 1 ? messages[issueType].singular : messages[issueType].plural
    }
    return message.replace('{}', issueCount)
  }
}
