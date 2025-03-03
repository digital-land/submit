import * as v from 'valibot'
import logger from '../utils/logger.js'
import axios from 'axios'
import config from '../../config/index.js'
import ResponseDetails from './responseDetails.js'

const ResponseDetailsOptions = v.optional(v.object({
  severity: v.optional(v.pipe(v.string(), v.minLength(2))),
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

    const response = await axios.get(url, { timeout: 30000 })

    const pagination = {
      totalResults: response.headers['x-pagination-total-results'],
      offset: response.headers['x-pagination-offset'],
      limit: response.headers['x-pagination-limit']
    }

    return new ResponseDetails(this.id, response.data, pagination, this.getColumnFieldLog())
  }

  /**
   *
   * @returns {string[]}
   */
  getErrorSummary () {
    if (!this.response || !this.response.data || !this.response.data['error-summary']) {
      logger.warn('trying to get error summary when there is none', { requestId: this.id })
      return []
    }
    return this.response.data['error-summary']
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
    if (this.response.data['error-summary'] == null) {
      logger.warn('trying to check for errors but there is no error-summary', { requestId: this.id })
      return true
    }
    return this.response.data['error-summary'].length > 0
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
    if (!this.response || !this.response.data || !this.response.data['column-field-log']) {
      logger.warn('trying to get column field log when there is none', { requestId: this.id })
      return []
    }
    return this.response.data['column-field-log']
  }

  getParams () {
    return this.params
  }

  getId () {
    return this.id
  }
}
