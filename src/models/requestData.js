import getVerboseColumns from '../utils/getVerboseColumns.js'
import logger from '../utils/logger.js'
import axios from 'axios'
import config from '../../config/index.js'

export default class RequestData {
  constructor (response) {
    Object.assign(this, response)
  }

  async fetchResponseDetails (pageNumber = 0, limit = 50) {
    const request = await axios.get(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${this.id}/response-details?offset=${pageNumber * limit}&limit=${limit}`, { timeout: 30000 })
    this.response.details = request.data

    this.pagination = {
      totalResults: request.headers['x-pagination-total-results'],
      offset: request.headers['x-pagination-offset'],
      limit: request.headers['x-pagination-limit']
    }
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

  getGeometryKey () {
    if (!this.params) {
      logger.error('trying to get geometry key when there are no params: request id: ' + this.id)
      return null
    }

    const geometryType = this.params.geom_type
    const columnFieldLog = this.getColumnFieldLog()

    if (!columnFieldLog) {
      return null
    }

    let geometryKey

    if (geometryType === 'point' && columnFieldLog.find(column => column.field === 'point')) {
      geometryKey = columnFieldLog.find(column => column.field === 'point').column
    } else if (columnFieldLog.find(column => column.field === 'geometry')) {
      geometryKey = columnFieldLog.find(column => column.field === 'geometry').column
    }

    return geometryKey
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

  getErrorSummary () {
    if (!this.response || !this.response.data || !this.response.data['error-summary']) {
      logger.error('trying to get error summary when there is none: request id: ' + this.id)
      return []
    }
    return this.response.data['error-summary']
  }

  // This function returns an array of rows with verbose columns
  getRowsWithVerboseColumns (filterNonErrors = false) {
    if (!this.response || !this.response.details) {
      logger.error('trying to get response details when there are none: request id: ' + this.id)
      return []
    }

    let rows = this.response.details

    if (filterNonErrors) {
      rows = rows.filter(row => row.issue_logs.filter(issue => issue.severity === 'error').length > 0)
    }

    // Map over the details in the response and return an array of rows with verbose columns
    return rows.map(row => ({
      entryNumber: row.entry_number,
      hasErrors: row.issue_logs.filter(issue => issue.severity === 'error').length > 0,
      columns: getVerboseColumns(row, this.getColumnFieldLog())
    }))
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

  getPagination (pageNumber) {
    pageNumber = parseInt(pageNumber)
    const totalPages = Math.ceil(this.pagination.totalResults / this.pagination.limit)

    const items = pagination(totalPages, pageNumber + 1).map(item => {
      if (item === '...') {
        return {
          ellipsis: true,
          href: '#'
        }
      } else {
        return {
          number: item,
          href: `/results/${this.id}/${parseInt(item) - 1}`,
          current: pageNumber === parseInt(item) - 1
        }
      }
    })

    return {
      totalResults: parseInt(this.pagination.totalResults),
      offset: parseInt(this.pagination.offset),
      limit: parseInt(this.pagination.limit),
      currentPage: pageNumber,
      nextPage: pageNumber < totalPages - 1 ? pageNumber + 1 : null,
      previousPage: pageNumber > 0 ? pageNumber - 1 : null,
      totalPages,
      items
    }
  }
}

const { min, max } = Math
const range = (lo, hi) => Array.from({ length: hi - lo }, (_, i) => i + lo)

export const pagination = (count, current, ellipsis = '...') => {
  if (count <= 5) {
    return range(1, count + 1)
  }
  const adjacent = 1
  const left = current === count ? current - 2 * adjacent : max(0, current - adjacent)
  const right = current === 1 ? 1 + adjacent * 2 : min(count, current + adjacent)
  const middle = range(left, right + 1)
  let leftEllipsis = left > 1
  let rightEllipsis = right < count

  if (leftEllipsis && middle[0] === 2) {
    leftEllipsis = false
    middle.unshift(1)
  }

  if (rightEllipsis && middle[middle.length - 1] === count - 1) {
    rightEllipsis = false
    middle.push(count)
  }

  const result = [
    ...(leftEllipsis ? [1, ellipsis] : middle),
    ...(leftEllipsis && rightEllipsis ? middle : []),
    ...(rightEllipsis ? [ellipsis, count] : middle)
  ]
  return result
}
