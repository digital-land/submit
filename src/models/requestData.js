import * as v from 'valibot'
import logger from '../utils/logger.js'
import axios from 'axios'
import config from '../../config/index.js'
import ResponseDetails from './responseDetails.js'

const ResponseDetailsOptions = v.optional(v.object({
  severity: v.optional(v.pipe(v.string(), v.minLength(2))),
  includeGeometries: v.optional(v.boolean()),
  issue: v.optional(v.object({
    issueType: v.pipe(v.string(), v.minLength(1)),
    field: v.pipe(v.string(), v.minLength(1))
  }))
}))

/**
 * Holds response data of 'http://ASYNC-REQUEST-API-HOST/requests/:result-id' endpoint.
 *
 * Allows to get the result details by invoking {@link fetchResponseDetails}
 */
export default class ResultData {
  constructor (responseData) {
    Object.assign(this, responseData)
  }

  /**
   * Fetches check results details, optionally filtered by issue (type and field), or severity (but not both).
   *
   * @param {number} [pageOffset=0] - Zero based page offset
   * @param {number} [limit=50] - Results per page limit
   * @param {Object} [opts] - Filter options
   * @param {string} [opts.severity] - Filter by severity
   * @param {Object} [opts.issue] - Filter by issue
   * @param {string} [opts.issue.issueType] - Issue type to filter by
   * @param {string} [opts.issue.field] - Field to filter by
   * @returns {Promise<ResponseDetails>} Response details
   */
  async fetchResponseDetails (pageOffset = 0, limit = 50, opts = { severity: undefined }) {
    v.parse(ResponseDetailsOptions, opts)
    const url = new URL(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${this.id}/response-details`)
    url.searchParams.append('offset', pageOffset * limit)
    url.searchParams.append('limit', limit)
    if ('issue' in opts) {
      const { issueType, field } = opts.issue
      // 'missing column' is an issue type we made up: the Request API does not use it, so we can't filter by that value
      if (issueType !== 'missing column') {
        url.searchParams.append('jsonpath', `$.issue_logs[*]."issue-type"=="${issueType}" && $.issue_logs[*]."field"=="${field}"`)
      }
    } else if (opts.severity) {
      url.searchParams.append('jsonpath', `$.issue_logs[*].severity=="${opts.severity}"`)
    }

    const geometryUrl = new URL(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${this.id}/geometries`)
    const [response, geometriesResponse] = await Promise.all([
      axios.get(url, { timeout: 30000 }),
      opts.includeGeometries ? fetchGeometries(geometryUrl) : Promise.resolve(undefined)
    ])
    const totalResults = Number.parseInt(response.headers['x-pagination-total-results'])

    const pagination = {
      totalResults: `${totalResults}`,
      offset: `${pageOffset * limit}`,
      limit: `${limit}`
    }

    return new ResponseDetails(this.id, response.data, pagination, this.getColumnFieldLog(), geometriesResponse)
  }

  isFailed () {
    return this.status === 'FAILED'
  }

  getType () {
    return this.type
  }

  getError () {
    if (!this.response) {
      logger.warn('trying to get error when there are none', { requestId: this.id })
      return { message: 'An unknown error occurred.' }
    }

    return this.response.error
  }

  hasErrors () {
    if (!this.response || !this.response.data) {
      logger.warn('trying to check for errors when there are none', { requestId: this.id })
      return true
    }
    const taskLog = this.response.data['task-log']
    if (taskLog == null) {
      logger.warn('trying to check for errors but there is no task-log', { requestId: this.id })
      return true
    }
    return taskLog.some(task => task.responsibility === 'external')
  }

  isComplete () {
    const finishedProcessingStatuses = ['COMPLETE', 'FAILED']
    return finishedProcessingStatuses.includes(this.status)
  }

  /**
   *
   * @returns {any[]}
   */
  getColumnFieldLog () {
    if (!this.response || !this.response.data) {
      logger.warn('trying to get column field log when there is none', { requestId: this.id })
      return []
    }

    const columnMapping = this.response.data['column-mapping'] ?? []
    const taskLog = this.response.data['task-log'] ?? []

    const log = columnMapping.map(({ field, column }) => ({ field, column, missing: false }))

    for (const task of taskLog) {
      if (task['task-source'] === 'column-field') {
        if (typeof task.details !== 'string' || task.details.length === 0) continue
        let details
        try {
          details = JSON.parse(task.details)
        } catch {
          continue
        }
        if (details.field) {
          log.push({ field: details.field, missing: true })
        }
      }
    }

    return log
  }

  /**
   * Returns issue tasks from the task-log, filtering out internal issues and
   * normalising the shape ready for `aggregateIssues`.
   *
   * @returns {Array<{issue-type: string, field: string, count: number, severity: string, responsibility: string, summary: string}>}
   */
  getIssueTasks () {
    if (!this.response || !this.response.data) {
      logger.warn('trying to get issue tasks when there is no response data', { requestId: this.id })
      return []
    }

    const taskLog = this.response.data['task-log'] ?? []
    return taskLog
      .filter(task => task['task-source'] === 'issue' && task.responsibility !== 'internal')
      .map(task => {
        let details
        try {
          details = JSON.parse(task.details)
        } catch {
          return null // skip entries with unparseable details
        }
        if (!details.issue_type || !details.field) return null
        return {
          'issue-type': details.issue_type,
          field: details.field,
          count: details.count ?? 1,
          severity: task.severity,
          responsibility: task.responsibility,
          summary: task.summary
        }
      })
      .filter(Boolean) // remove nulls from failed parses
  }

  getParams () {
    return this.params
  }

  getId () {
    return this.id
  }

  getPlugin () {
    if (!this.response || !this.response.data) {
      logger.warn('trying to get plugin when response data is missing', { requestId: this.id })
      return null
    }
    return this.response.data.plugin ?? null
  }
}

async function fetchGeometries (url) {
  const response = await axios.get(url, { timeout: 30000 })
  const totalResults = Number.parseInt(response.headers?.['x-pagination-total-results'])
  const limit = Number.parseInt(response.headers?.['x-pagination-limit']) || getGeometryItems(response.data).length || 500
  const geometries = getGeometryItems(response.data)

  if (!Number.isInteger(totalResults) || geometries.length >= totalResults) {
    return geometries.length > 0 ? geometries : response.data
  }

  for (let offset = geometries.length; offset < totalResults; offset += limit) {
    const pageUrl = new URL(url)
    pageUrl.searchParams.set('offset', offset)
    pageUrl.searchParams.set('limit', limit)
    const page = await axios.get(pageUrl, { timeout: 30000 })
    geometries.push(...getGeometryItems(page.data))
  }

  return geometries
}

function getGeometryItems (data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.geometries)) return data.geometries
  if (Array.isArray(data?.features)) return data.features
  return []
}
