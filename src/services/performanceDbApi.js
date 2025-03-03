/**
 * Performance DB API service
 */
import datasette from './datasette.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

// ===========================================

// for now we are using a csv for these messages but we will probably end up moving to a table, so for now this can sit in the fake performance db api

import csv from 'csv-parser' // ToDo: remember to remove this from package.json when we move away from csv
import fs from 'node:fs'

const messages = new Map()

/**
 * Reads messages from CSV files and populates `messages` map.
 */
export async function initialiseMessages () {
  // the csv parser works streams so we have wrap it with promises
  const fieldIssuesMessages = new Promise((resolve, reject) => {
    fs.createReadStream('src/content/fieldIssueMessages.csv').pipe(csv()).on('data', row => {
      try {
        messages.set(row.issue_type, {
          singular: row.singular_message,
          plural: row.plural_message
        })
      } catch (error) {
        reject(error)
      }
    }).on('end', () => {
      logger.debug('finished populating messages', { type: types.App })
      resolve(messages)
    })
  })

  await fieldIssuesMessages

  const entityMessages = new Promise((resolve, reject) => {
    fs.createReadStream('src/content/entityIssueMessages.csv').pipe(csv()).on('data', row => {
      try {
        const messageInfo = messages.get(row.issue_type)
        messageInfo.entities_singular = row.singular_message
        messageInfo.entities_plural = row.plural_message
      } catch (error) {
        reject(error)
      }
    }).on('end', () => {
      resolve(messages)
    })
  })

  await entityMessages

  const allRowsMessages = new Promise((resolve, reject) => {
    fs.createReadStream('src/content/allRowsIssueMessages.csv').pipe(csv()).on('data', row => {
      try {
        const messageInfo = messages.get(row.issue_type)
        messageInfo.allRows_message = row.allRows_message
      } catch (error) {
        reject(error)
      }
    }).on('end', () => {
      // Messages object is now populated
      logger.info('allRowsMessages stream end', { type: types.App })
      resolve(messages)
    })
  })

  await allRowsMessages
}

await initialiseMessages()

// ===========================================

const datasetIssuesQuery = (resource, datasetId) => {
  return /* sql */ `
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
  GROUP BY i.issue_type, i.field
  ORDER BY it.severity`
}

/**
 * @typedef {Object} Dataset
 * @property {string} status - One of: 'Not submitted', 'Error', 'Needs fixing', 'Warning', 'Live'
 * @property {string} endpoint
 * @property {number} issue_count
 * @property {?string} error
 */

/**
 * @typedef {Object} LpaOverview
 * @property {Object.<string, Dataset>} datasets - Map of dataset names to Dataset objects
 */

const entityCountSelectFragment = (dataset, resource, entityCount) => `select '${dataset}' as d, '${resource}' as r, ${entityCount} as e`

/**
 * Generates a query for LPA overview data
 *
 * @param {string} lpa - The LPA identifier
 * @param {Object} params - Query parameters
 * @param {string[]} params.datasetsFilter - List of dataset names to filter by
 * @param {Object[]} params.entityCounts - Array of entity count objects
 * @param {string} params.entityCounts[].dataset - Dataset name
 * @param {string} params.entityCounts[].resource - Resource identifier
 * @param {number=} params.entityCounts[].entityCount - Optional entity count
 * @returns {string} The generated SQL query
 */
export function lpaOverviewQuery (lpa, params) {
  let datasetClause = ''
  if (params.datasetsFilter) {
    const datasetString = params.datasetsFilter.map(dataset => `'${dataset}'`).join(',')
    datasetClause = `AND rle.pipeline in (${datasetString})`
  }

  const entityCountsSelects = []
  for (const { resource, dataset, entityCount } of params.entityCounts) {
    if (Number.isInteger(entityCount) && entityCount >= 0) {
      entityCountsSelects.push(entityCountSelectFragment(dataset, resource, entityCount))
    }
  }
  if (entityCountsSelects.length === 0) {
    // add bogus select, to ensure the resulting SQL is valid
    entityCountsSelects.push(entityCountSelectFragment('none', 'none', 0))
  }

  return /* sql */`
with entity_counts as (
select d as dataset, r as resource, e as entity_count
from (
  ${entityCountsSelects.join(' union ')}
)
)
SELECT
  REPLACE(rle.organisation, '-eng', '') as organisation,
  rle.name,
  rle.pipeline as dataset,
  rle.endpoint,
  rle.resource,
  rle.latest_exception,
  rle.latest_status as http_status,
  coalesce(ec.entity_count, 0) as entity_count,
  i.count_issues as issue_count,
  i.responsibility,
  i.fields,
  case
      when (rle.latest_status is null) then 'Not submitted'
      when (rle.latest_status != '200') then 'Error'
      when (i.severity = 'error') then 'Needs fixing'
      else 'Live'
  end as status,
  case
      when ((cast(rle.latest_status as integer) > 200)) then format('There was a %s error accessing the endpoint URL', rle.latest_status)
      else null
  end as error,
  case
      when (i.severity = 'info') then ''
      else i.issue_type
  end as issue_type,
  case
      when (i.severity = 'info') then ''
      else i.severity
  end as severity
FROM
  reporting_latest_endpoints rle
LEFT JOIN
  endpoint_dataset_issue_type_summary i ON rle.resource = i.resource AND rle.pipeline = i.dataset
LEFT OUTER JOIN
  entity_counts ec ON ec.resource = rle.resource AND ec.dataset = rle.pipeline
WHERE
  REPLACE(rle.organisation, '-eng', '') = '${lpa}'
  ${datasetClause}
ORDER BY
  rle.organisation,
  rle.name;`
}

export const issuesQueryLimit = 1000

/**
 * @typedef {Object} TaskMessageOptions
 * @property {string} issue_type - Type of issue
 * @property {number} num_issues - Number of issues
 * @property {number} rowCount - Total row count
 * @property {string} field - Field name
 * @property {('html'|'text')} [format] - Output format
 */

/**
 * Performance DB API service
 * @export
 * @default
 */
export default {

  resourceStatusQuery (lpa, datasetId) {
    return /* sql */ `
    select resource, endpoint_url, endpoint, status, latest_log_entry_date, days_since_200
    from reporting_latest_endpoints
    WHERE REPLACE(organisation, '-eng', '') = '${lpa}'
    AND pipeline = '${datasetId}'`
  },

  datasetIssuesQuery,

  /**
     * Returns a task message based on the provided issue type, issue count, and entity count.
     *
     * Pass format = 'html' if you want the fields in the message to be marked up with span.column-name. Otherwise
     * plain text message is returned.
     *
     * @param {TaskMessageOptions} options - Task message options
     * @param {boolean} [entityLevel=false] - Whether to use entity-level or dataset level messaging
     *
     * @returns {string} The task message with the issue count inserted
     *
     * @throws {Error} If the issue type is unknown
     */
  getTaskMessage ({
    issue_type: issueType,
    num_issues: numIssues,
    rowCount,
    field,
    ...rest
  }, entityLevel = false) {
    const messageInfo = messages.get(issueType)
    if (!messageInfo) {
      logger.warn({
        message: `PerformanceDbApi.getTaskMessage(): Unknown issue type: ${issueType}`,
        type: types.App
      })
      return `${numIssues} issue of type ${issueType}`
    }

    if (!field) {
      logger.warn('performanceDbApi.getTaskMessage(): no field provided', { issueType })
      field = 'value'
    }

    let message
    if (Number.isInteger(rowCount) && numIssues >= rowCount) {
      message = messageInfo.allRows_message
    } else if (entityLevel) {
      message = numIssues === 1
        ? messageInfo.entities_singular
        : messageInfo.entities_plural
    } else {
      message = numIssues === 1
        ? messageInfo.singular
        : messageInfo.plural
    }
    const fieldText = rest.format === 'html' ? `<span class="column-name">${field}</span>` : field
    return message.replace('{num_issues}', numIssues).replace('{num_entries}', numIssues).replace('{column_name}', fieldText)
  },

  latestResourceQuery: (lpa, dataset) => {
    return /* sql */ `
    SELECT rle.resource, rle.status, rle.endpoint, rle.endpoint_url, rle.status, rle.days_since_200, rle.exception, rle.resource_start_date as startDate
    FROM reporting_latest_endpoints rle
    LEFT JOIN resource_organisation ro ON rle.resource = ro.resource
    LEFT JOIN organisation o ON REPLACE(ro.organisation, '-eng', '') = o.organisation
    WHERE REPLACE(ro.organisation, '-eng', '') = '${lpa}'
    AND rle.pipeline = '${dataset}'`
  },

  /**
   * Query for obtaining resource ids for given datasets
   *
   * @param {*} lpa
   * @param {{datasetsFilter: string[]}} params
   * @returns {string} SQL
   */
  latestResourcesQuery: (lpa, params) => {
    let datasetClause = ''
    if (params.datasetsFilter) {
      const datasetString = params.datasetsFilter.map(dataset => `'${dataset}'`).join(',')
      datasetClause = `AND rle.pipeline in (${datasetString})`
    }

    return /* sql */ `
    select
      rle.pipeline as dataset,
      rle.resource as resource,
      rle.resource_start_date as startDate
    from reporting_latest_endpoints rle
    where
      REPLACE(organisation, '-eng', '') = '${lpa}'
      ${datasetClause}`
  },
  /**
   * Query for datasets with active endpoints with error status.
   *
   * @param {string} lpa
   * @param {{datasetsFilter: string[]}} params
   * @returns {string} SQL
   */
  datasetErrorStatusQuery: (lpa, params) => {
    return /* sql */ `
    select
      dataset
    from
      provision_summary
    where
      coalesce("active_endpoint_count", 0) > 1 and coalesce("error_endpoint_count", 0) >= 1
      and "organisation" = '${lpa}'
      and "dataset" in (${params.datasetsFilter.map(dataset => `'${dataset}'`).join(',')})
    order by dataset asc`
  },

  /**
    * Get entity counts for a list of resources
    * @param {Array<Object>} resources - Array of resource objects
    * @param {string} resources[].resource - Resource identifier
    * @param {string} resources[].dataset - Dataset identifier
    * @returns {Promise<Array<Object>>} Array of objects containing resource, dataset and optional entityCount
    */
  async getEntityCounts (resources) {
    const requests = resources.map(({ resource, dataset }) => {
      const q = datasette.runQuery(this.entityCountQuery(resource), dataset)
      return q
        .then(result => {
          if (result.formattedData.length === 0) {
            logger.info({ message: 'getEntityCounts(): No results for resource.', resource, dataset, type: types.App })
            return { resource, dataset }
          }
          return { resource, dataset, entityCount: result.formattedData[0].entity_count }
        })
        .catch((error) => {
          logger.warn('getEntityCounts(): could not obtain entity counts. Proceeding without them.',
            { type: types.App, errorMessage: error.message, errorStack: error.stack })
          return { resource, dataset }
        })
    })

    const results = await Promise.allSettled(requests)
    return results
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value)
  },

  getEntitiesWithIssuesCountQuery: (req) => {
    const { issue_type: issueType, issue_field: issueField } = req.params
    const { resource: resourceId } = req.resource
    return /* sql */ `
    SELECT count(DISTINCT entry_number) as count
    FROM issue
    WHERE resource = '${resourceId}'
    AND issue_type = '${issueType}'
    AND field = '${issueField}'
  `
  },

  /**
   *
   * @param {{ params: { issue_type: string, issue_field: string}, parsedParams: { pageNumber: number}, resource: { resource: string } }} req
   * @returns {string} sql query
   */
  getIssuesQuery: (req) => {
    const { issue_type: issueType, issue_field: issueField } = req.params
    const { pageNumber } = req.parsedParams
    const resourceId = req.resource.resource
    const offset = Math.floor((pageNumber - 1) / issuesQueryLimit) * issuesQueryLimit

    return /* sql */ `
      SELECT i.field, i.line_number, entry_number, message, issue_type, value
      FROM issue i
      WHERE resource = '${resourceId}'
      AND issue_type = '${issueType}'
      AND field = '${issueField}'
      ORDER BY entry_number ASC
      LIMIT 1000 ${offset ? `OFFSET ${offset}` : ''}`
  },

  /**
     * Get entry details for a specific resource
     * @param {string} resourceId - Resource identifier
     * @param {number} entryNumber - Entry number
     * @param {string} dataset - Dataset identifier
     * @returns {Promise<Array<Object>>} Array of entry objects containing field and value information
     */
  async getEntry (resourceId, entryNumber, dataset) {
    logger.debug({ message: 'getEntry()', resourceId, entryNumber, dataset, type: types.App })
    // TODO: why do we order by rowid?
    const sql = /* sql */ `
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
