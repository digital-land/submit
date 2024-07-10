import logger from '../utils/logger.js'
import axios from 'axios'
import config from '../../config/index.js'
import ResponseDetails from './responseDetails.js'

export default class RequestData {
  constructor (response) {
    Object.assign(this, response)
  }

  async fetchResponseDetails (pageNumber = 0, limit = 50, severity = undefined) {
    const urlParams = new URLSearchParams()
    urlParams.append('offset', pageNumber * limit)
    urlParams.append('limit', limit)
    if (severity) {
      urlParams.append('jsonpath', `$.issue_logs[*].severity=="${severity}"`)
    }

    const request = await axios.get(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${this.id}/response-details?${urlParams.toString()}`, { timeout: 30000 })

    const pagination = {
      totalResults: request.headers['x-pagination-total-results'],
      offset: request.headers['x-pagination-offset'],
      limit: request.headers['x-pagination-limit']
    }

    return new ResponseDetails(this.id, request.data, pagination, this.getColumnFieldLog())
  }

  getErrorSummary () {
    if (!this.response || !this.response.data || !this.response.data['error-summary']) {
      logger.error('trying to get error summary when there is none: request id: ' + this.id)
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
      logger.error('trying to get error when there are none: request id: ' + this.id)
      return { message: 'An unknown error occurred.' }
    }

    return this.response.error
  }

  hasErrors () {
    if (!this.response || !this.response.data) {
      logger.error('trying to check for errors when there are none: request id: ' + this.id)
      return true
    }
    if (this.response.data['error-summary'] == null) {
      logger.error('trying to check for errors but there is no error-summary: request id: ' + this.id)
      return true
    }
    return this.response.data['error-summary'].length > 0
  }

  isComplete () {
    const finishedProcessingStatuses = ['COMPLETE', 'FAILED']
    return finishedProcessingStatuses.includes(this.status)
  }

  getColumnFieldLog () {
    if (!this.response || !this.response.data || !this.response.data['column-field-log']) {
      logger.error('trying to get column field log when there is none: request id: ' + this.id)
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
