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

    return new ResponseDetails(request.data, pagination, this.getColumnFieldLog())
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
    if (this.response == null) {
      return true
    }
    if (this.response.data == null) {
      return true
    }
    if (this.response.data['error-summary'] == null) {
      return true
    }
    return this.response.data['error-summary'].length > 0
  }

  getGeometryKey () {
    const columnFieldLog = this.getColumnFieldLog()

    if (!columnFieldLog) {
      return null
    }

    const columnFieldEntry = columnFieldLog.find(column => column.field === 'point') || columnFieldLog.find(column => column.field === 'geometry')

    if (!columnFieldEntry) {
      return null
    }

    return columnFieldEntry.column
  }

  isComplete () {
    const finishedProcessingStatuses = ['COMPLETE', 'FAILED']
    return finishedProcessingStatuses.includes(this.status)
  }

  getRows () {
    if (!this.response || !this.response.details) {
      logger.error('trying to get response details when there are none: request id: ' + this.id)
      return []
    }
    return this.response.details
  }

  getColumnFieldLog () {
    if (!this.response || !this.response.data || !this.response.data['column-field-log']) {
      logger.error('trying to get column field log when there is none: request id: ' + this.id)
      return []
    }
    return this.response.data['column-field-log']
  }

  getColumns (includeNonMapped = true) {
    if (!this.getRows().length) {
      return []
    }
    return [...new Set(this.getRows().map(row => row.converted_row).flatMap(row => Object.keys(row)))]
  }

  getFields (includeNonMapped = true) {
    return [...new Set(this.getColumns().map(column => {
      const columnFieldLog = this.getColumnFieldLog()
      const fieldLog = columnFieldLog.find(fieldLog => fieldLog.column === column)
      if (!fieldLog) {
        return column
      } else {
        return fieldLog.field
      }
    }))]
  }

  getFieldMappings () {
    return Object.fromEntries(this.getFields().map(field => {
      const columnFieldLog = this.getColumnFieldLog()
      const columnLog = columnFieldLog.find(fieldLog => fieldLog.field === field)
      return [
        field,
        columnLog ? columnLog.column : null
      ]
    }))
  }

  getParams () {
    return this.params
  }

  getId () {
    return this.id
  }

  getGeometries () {
    if (!this.response || !this.response.details) {
      logger.error('trying to get response details when there are none: request id: ' + this.id)
      return undefined
    }

    const geometryKey = this.getGeometryKey()
    const geometries = this.response.details.map(row => row.converted_row[geometryKey]).filter(geometry => geometry !== '')
    if (geometries.length === 0) {
      return null
    }
    return geometries
  }
}
