import logger from '../utils/logger.js'
import axios from 'axios'
import config from '../../config/index.js'
import ResponseDetails from './responseDetails.js'

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
   * @param {number} pageOffset zero based
   * @param {number} limit limit
   * @param {string?} severity severity
   * @returns {ResponseDetails}
   */
  async fetchResponseDetails (pageOffset = 0, limit = 50, severity = undefined) {
    const urlParams = new URLSearchParams()
    urlParams.append('offset', pageOffset * limit)
    urlParams.append('limit', limit)
    if (severity) {
      urlParams.append('jsonpath', `$.issue_logs[*].severity=="${severity}"`)
    }

    const response = await axios.get(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${this.id}/response-details?${urlParams.toString()}`, { timeout: 30000 })

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
