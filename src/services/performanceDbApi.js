/**
 * Performance DB API service
 */
import datasette from './datasette.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

// ===========================================

// for now we are using a csv for these messages but we will probably end up moving to a table, so for now this can sit in the fake performance db api

import csv from 'csv-parser' // ToDo: remember to remove this from package.json when we move away from csv
import fs from 'fs'

const messages = new Map()

fs.createReadStream('src/content/fieldIssueMessages.csv')
  .pipe(csv())
  .on('data', (row) => {
    messages.set(row.issue_type, {
      singular: row.singular_message,
      plural: row.plural_message.replace('{num_issues}', '{}')
    })
  })
  .on('end', () => {
    getEntityMessages()
  })

function getEntityMessages () {
  fs.createReadStream('src/content/entityIssueMessages.csv')
    .pipe(csv())
    .on('data', (row) => {
      const messageInfo = messages.get(row.issue_type)
      messageInfo.entities_singular = row.singular_message.replace('{num_entries}', '{}')
      messageInfo.entities_plural = row.plural_message.replace('{num_entries}', '{}')
    })
    .on('end', () => {
    // Messages object is now populated
    })
}

// ===========================================

/**
 * @typedef {object} Dataset
 * @property {'Not submitted' | 'Error' | 'Needs fixing' | 'Warning' | 'Live' } status
 * @property {string} endpoint
 * @property {number} issue_count
 * @property {?string} error
 */

/**
 * @typedef {object} LpaOverview
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
  getLpaOverview: async (lpa, params = {}) => {
    let datasetClause = ''
    if (params.datasetsFilter) {
      const datasetString = params.datasetsFilter.map(dataset => `'${dataset}'`).join(',')
      datasetClause = `AND rle.pipeline in (${datasetString})`
    }

    const query = /* sql */ `
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
      when (rle.status is null) then 'Not Submitted'
      when (rle.status != '200') then 'Error'
      when (it.severity = 'error') then 'Needs fixing'
      else 'Live'
  end as status,
    case
        when ((cast(rle.status as integer) > 200)) then format('There was a %s error accessing the data URL', rle.status)
        else null
  end as error,
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
      when it.severity != 'info' and it.severity != 'warning' then 1
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
    ${datasetClause}
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
    if (result.formattedData.length === 0) {
      logger.info(`No records found for LPA=${lpa}`)
    }

    const datasets = result.formattedData.reduce((accumulator, row) => {
      accumulator[row.dataset] = {
        endpoint: row.endpoint,
        status: row.status,
        issue_count: row.issue_count,
        error: row.error
      }
      return accumulator
    }, {})

    return { datasets }
  },

  getResourceStatus: async (lpa, datasetId) => {
    const sql = /* sql */`
      select endpoint_url, status, latest_log_entry_date, days_since_200 from reporting_latest_endpoints
      WHERE REPLACE(organisation, '-eng', '') = '${lpa}'
      AND pipeline = '${datasetId}'`

    const result = await datasette.runQuery(sql)

    return result.formattedData[0]
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
          p.organisation = '${lpa}' 
          AND p.dataset = '${datasetId}'
          AND (it.severity == 'error')
      GROUP BY i.issue_type
      ORDER BY it.severity`

    const result = await datasette.runQuery(sql)
    /* eslint camelcase: "off" */
    return result.formattedData.map(({ num_issues, issue_type, resource, status }) => {
      return { num_issues, issue_type, resource, status }
    })
  },

  getTaskMessage (issueType, issueCount, entityLevel = false) {
    const messageInfo = messages.get(issueType)
    if (!messageInfo) {
      logger.warn({
        message: `PerformanceDbApi.getTaskMessage(): Unknown issue type: ${issueType}`,
        type: types.App
      })
      return `${issueCount} issue of type ${issueType}`
    }

    let message
    if (entityLevel) {
      message = issueCount === 1 ? messageInfo.entities_singular : messageInfo.entities_plural
    } else {
      message = issueCount === 1 ? messageInfo.singular : messageInfo.plural
    }
    return message.replace('{}', issueCount)
  },

  async getLatestResource (lpa, dataset) {
    const sql = `
      SELECT rle.resource, rle.status, rle.endpoint, rle.endpoint_url, rle.status, rle.days_since_200, rle.exception
      FROM reporting_latest_endpoints rle
      LEFT JOIN resource_organisation ro ON rle.resource = ro.resource
      LEFT JOIN organisation o ON REPLACE(ro.organisation, '-eng', '') = o.organisation
      WHERE REPLACE(ro.organisation, '-eng', '') = '${lpa}'
      AND rle.pipeline = '${dataset}'`

    const result = await datasette.runQuery(sql)

    return result.formattedData[0]
  },

  async getEntitiesWithIssuesCount (resource, issueType, database = 'digital-land') {
    const sql = `
      SELECT count(DISTINCT entry_number) as count
      FROM issue
      WHERE resource = '${resource}'
      AND issue_type = '${issueType}'
    `

    const result = await datasette.runQuery(sql, database)

    return result.formattedData[0].count
  },

  async getIssues (resource, issueType, database = 'digital-land') {
    const sql = `
      SELECT i.field, i.line_number, entry_number, message, issue_type, value
      FROM issue i
      WHERE resource = '${resource}'
      AND issue_type = '${issueType}'
    `

    const result = await datasette.runQuery(sql, database)

    return result.formattedData
  },

  /**
   *
   * @param {*} resourceId
   * @param {*} entryNumber
   * @param {*} dataset
   * @returns {Promise<{field: string, value: string, entry_number: number}[]>}
   */
  async getEntry (resourceId, entryNumber, dataset) {
    // TODO: why do we order by rowid?
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
        and fr.entry_number = ${entryNumber}
      order by
        fr.rowid`

    const result = await datasette.runQuery(sql, dataset)

    return result.formattedData
  }
}
