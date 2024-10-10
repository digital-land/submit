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

fs.createReadStream('src/content/fieldIssueMessages.csv').pipe(csv()).on('data', row => {
  messages.set(row.issue_type, {
    singular: row.singular_message,
    plural: row.plural_message
  })
}).on('end', () => {
  getEntityMessages()
  getAllRowsMessages()
})

function getEntityMessages () {
  fs.createReadStream('src/content/entityIssueMessages.csv').pipe(csv()).on('data', row => {
    const messageInfo = messages.get(row.issue_type)
    messageInfo.entities_singular = row.singular_message
    messageInfo.entities_plural = row.plural_message
  }).on('end', () => {
    // Messages object is now populated
  })
}

function getAllRowsMessages () {
  fs.createReadStream('src/content/allRowsIssueMessages.csv').pipe(csv()).on('data', row => {
    const messageInfo = messages.get(row.issue_type)
    messageInfo.allRows_message = row.allRows_message
  }).on('end', () => {
    // Messages object is now populated
  })
}

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
 * @typedef {object} Dataset
 * @property {'Not submitted' | 'Error' | 'Needs fixing' | 'Warning' | 'Live' } status
 * @property {string} endpoint
 * @property {number} issue_count
 * @property {?string} error
 */

/**
 * @typedef {object} LpaOverview // this needs to be updated
 * @property {{ [dataset: string]: Dataset }} datasets
 */

const entityCountSelectFragment = (dataset, resource, entityCount) => `select '${dataset}' as d, '${resource}' as r, ${entityCount} as e`

/**
 *
 * @param {string} lpa
 * @param {{datasetsFilter: string[], entityCounts: { dataset: string, resource: string, entityCount?: number}[]}} params
 * @returns
 */
export function lpaOverviewQuery (lpa, params) {
  let datasetClause = ''
  if (params.datasetsFilter) {
    const datasetString = params.datasetsFilter.map(dataset => `'${dataset}'`).join(',')
    datasetClause = `AND rle.pipeline in (${datasetString})`
  }

  const entityCountsSelects = []
  for (const { resource, dataset, entityCount } of params.entityCounts) {
    if (entityCount && entityCount >= 0) {
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
      when ((cast(rle.latest_status as integer) > 200)) then format('There was a %s error accessing the data URL', rle.latest_status)
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
  AND (i.severity is NULL OR i.severity not in ('info'))
  ${datasetClause}
ORDER BY
  rle.organisation,
  rle.name;`
}

/**
 * Performance DB API service
 * @export
 * @default
 */
export default {

  resourceStatusQuery (lpa, datasetId) {
    return /* sql */ `
    select resource, endpoint_url, status, latest_log_entry_date, days_since_200
    from reporting_latest_endpoints
    WHERE REPLACE(organisation, '-eng', '') = '${lpa}'
    AND pipeline = '${datasetId}'`
  },

  datasetIssuesQuery,

  /**
     * Retrieves LPA dataset issues for a given resource and dataset ID.
     *
     * @param {string} resource - The resource to retrieve issues for.
     * @param {string} datasetId - The ID of the dataset to retrieve issues for.
     *
     * @returns {Promise<object[]>} An array of issue objects, each containing:
     *   - field: {string} The field associated with the issue.
     *   - issue_type: {string} The type of issue.
     *   - line_number: {number} The line number of the issue.
     *   - value: {string} The value associated with the issue.
     *   - message: {string} The error message associated with the issue.
     *   - status: {string} The status of the issue ('Needs fixing' or 'Live').
     *   - num_issues: {number} The number of issues of this type.
     */
  getLpaDatasetIssues: async (resource, datasetId) => {
    const sql = datasetIssuesQuery(resource, datasetId)
    const result = await datasette.runQuery(sql)
    return result.formattedData
  },

  /**
     * Returns a task message based on the provided issue type, issue count, and entity count.
     *
     * @param {Object} options - Options object
     * @param {string} options.issueType - The type of issue
     * @param {number} options.num_issues - The number of issues
     * @param {number} options.entityCount - The number of entities
     * @param {boolean} [entityLevel=false] - Whether to use entity-level or dataset level messaging
     *
     * @returns {string} The task message with the issue count inserted
     *
     * @throws {Error} If the issue type is unknown
     */
  getTaskMessage ({
    issue_type: issueType,
    num_issues: numIssues,
    entityCount,
    field
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
    if (entityCount && numIssues >= entityCount) {
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
    return message.replace('{num_issues}', numIssues).replace('{num_entries}', numIssues).replace('{column_name}', field)
  },

  latestResourceQuery: (lpa, dataset) => {
    return /* sql */ `
    SELECT rle.resource, rle.status, rle.endpoint, rle.endpoint_url, rle.status, rle.days_since_200, rle.exception
    FROM reporting_latest_endpoints rle
    LEFT JOIN resource_organisation ro ON rle.resource = ro.resource
    LEFT JOIN organisation o ON REPLACE(ro.organisation, '-eng', '') = o.organisation
    WHERE REPLACE(ro.organisation, '-eng', '') = '${lpa}'
    AND rle.pipeline = '${dataset}'`
  },

  /**
     * Retrieves the latest resource information for a given LPA and dataset.
     *
     * @param {string} lpa - The Local Planning Authority (LPA) identifier.
     * @param {string} dataset - The dataset to retrieve the latest resource for.
     * @returns {object} The latest resource information, including the resource, status, endpoint, endpoint URL, days since 200, and exception.
     */
  async getLatestResource (lpa, dataset) {
    const sql = this.latestResourceQuery(lpa, dataset)
    const result = await datasette.runQuery(sql)

    return result.formattedData[0]
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
      rle.resource as resource
    from reporting_latest_endpoints rle
    where
      REPLACE(organisation, '-eng', '') = '${lpa}'
      ${datasetClause}`
  },

  /**
    *
    * @param {{resource: string, dataset: string}[]} resources
    * @returns {Promise<{ resource: string, dataset: string, entityCount?: number}[]>}
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
    return (await Promise.allSettled(requests)).map(p => p.value)
  },

  /**
     * Retrieves the count of entities with issues of a specific type and field.
     *
     * @param {Object} params - Parameters for the query
     * @param {string} params.resource - Resource to filter by
     * @param {string} params.issueType - Issue type to filter by
     * @param {string} params.issueField - Field to filter by
     * @param {string} [database="digital-land"] - Database to query (optional)
     * @returns {Promise<number>} Count of entities with issues
     */
  async getEntitiesWithIssuesCount ({
    resource,
    issueType,
    issueField
  }, database = 'digital-land') {
    const sql = `
    SELECT count(DISTINCT entry_number) as count
    FROM issue
    WHERE resource = '${resource}'
    AND issue_type = '${issueType}'
    AND field = '${issueField}'
  `

    const result = await datasette.runQuery(sql, database)

    return result.formattedData[0].count
  },

  /**
     * Retrieves issues from the performance database.
     *
     * @param {Object} params - Object with parameters for the query
     * @param {string} params.resource - Resource to filter issues by
     * @param {string} params.issueType - Issue type to filter by
     * @param {string} params.issueField - Field to filter by
     * @param {string} [database="digital-land"] - Database to query (defaults to "digital-land")
     * @returns {Promise<Object>} - Promise resolving to an object with formatted data
     */
  async getIssues ({
    resource,
    issueType,
    issueField
  }, database = 'digital-land') {
    const sql = `
    SELECT i.field, i.line_number, entry_number, message, issue_type, value
    FROM issue i
    WHERE resource = '${resource}'
    AND issue_type = '${issueType}'
    AND field = '${issueField}'
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

  entityCountQuery (orgEntity) {
    return /* sql */ `
      select count(entity) as entity_count
      from entity
      WHERE organisation_entity = '${orgEntity}'
    `
  },

  /**
   * Retrieves the entity count for a given organisation and dataset.
   *
   * @param {string} orgEntity - The organisation entity to retrieve the entity count for.
   * @param {string} dataset - The dataset to retrieve the entity count from.
   * @returns {number} The entity count for the given resource and dataset.
   */
  async getEntityCount (orgEntity, dataset) {
    const query = this.entityCountQuery(orgEntity)
    const result = await datasette.runQuery(query, dataset)
    return result.formattedData[0].entity_count
  }
}
