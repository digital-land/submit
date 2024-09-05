/**
 * Performance DB API service
 */
import datasette from './datasette.js'
import logger from '../utils/logger.js'

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
      plural: row.plural_message
    })
  })
  .on('end', () => {
    getEntityMessages()
    getAllRowsMessages()
  })

function getEntityMessages () {
  fs.createReadStream('src/content/entityIssueMessages.csv')
    .pipe(csv())
    .on('data', (row) => {
      const messageInfo = messages.get(row.issue_type)
      messageInfo.entities_singular = row.singular_message
      messageInfo.entities_plural = row.plural_message
    })
    .on('end', () => {
      // Messages object is now populated
    })
}

function getAllRowsMessages () {
  fs.createReadStream('src/content/allRowsIssueMessages.csv')
    .pipe(csv())
    .on('data', (row) => {
      const messageInfo = messages.get(row.issue_type)
      messageInfo.allRows_message = row.allRows_message
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

  getLpaDatasetIssues: async (resource, datasetId) => {
    const sql = `
      SELECT
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
          issue i
      LEFT JOIN
        issue_type it ON i.issue_type = it.issue_type
      WHERE
          i.resource = '${resource}' 
          AND i.dataset = '${datasetId}'
          AND (it.severity == 'error')
      GROUP BY i.issue_type
      ORDER BY it.severity`

    const result = await datasette.runQuery(sql)
    return result.formattedData
  },

  /**
   * Returns a task message based on the provided issue type, issue count, and entity count.
   *
   * @param {Object} options - Options object
   * @param {string} options.issueType - The type of issue
   * @param {number} options.issueCount - The number of issues
   * @param {number} options.entityCount - The number of entities
   * @param {boolean} [entityLevel=false] - Whether to use entity-level or dataset level messaging
   *
   * @returns {string} The task message with the issue count inserted
   *
   * @throws {Error} If the issue type is unknown
   */
  getTaskMessage ({ issue_type: issueType, num_issues: numIssues, entityCount, field }, entityLevel = false) {
    const messageInfo = messages.get(issueType)
    if (!messageInfo) {
      throw new Error(`Unknown issue type: ${issueType}`)
    }

    let message
    if (entityCount && numIssues >= entityCount) {
      message = messageInfo.allRows_message
    } else if (entityLevel) {
      message = numIssues === 1 ? messageInfo.entities_singular : messageInfo.entities_plural
    } else {
      message = numIssues === 1 ? messageInfo.singular : messageInfo.plural
    }
    return message.replace('{num_issues}', numIssues).replace('{num_entries}', numIssues).replace('{column_name}', field)
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
  },

  async getEntityCount (resource, dataset) {
    const query = /* sql */`
      select dataset, entity_count, resource
      from dataset_resource
      WHERE resource = '${resource}'
    `

    const result = await datasette.runQuery(query, dataset)

    return result.formattedData[0].entity_count
  }
}
