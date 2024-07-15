import { getVerboseColumns } from '../utils/getVerboseColumns.js'
import logger from '../utils/logger.js'

export default class ResponseDetails {
  constructor (id, response, pagination, columnFieldLog) {
    this.id = id
    this.response = response
    this.pagination = pagination
    this.columnFieldLog = columnFieldLog
  }

  getRows () {
    if (!this.response) {
      logger.error('trying to get response details when there are none: request id: ' + this.id)
      return []
    }
    return this.response
  }

  getColumnFieldLog () {
    if (!this.columnFieldLog) {
      logger.error('trying to get column field log when there is none: request id: ' + this.id)
      return []
    }
    return this.columnFieldLog
  }

  getColumns () {
    if (!this.getRows().length) {
      return []
    }

    const fields = this.getFields()

    const ColumnsWithDuplicates = fields.map(field => {
      const columnFieldLog = this.getColumnFieldLog()
      const fieldLog = columnFieldLog.find(fieldLog => fieldLog.field === field)
      return fieldLog ? fieldLog.column : field
    })

    return [...new Set(ColumnsWithDuplicates)]
  }

  getFields () {
    const columnKeys = [...new Set(this.getRows().map(row => row.converted_row).flatMap(row => Object.keys(row)))]

    return [...new Set(columnKeys.map(column => {
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

  // This function returns an array of rows with verbose columns
  getRowsWithVerboseColumns (filterNonErrors = false) {
    if (!this.response) {
      logger.error('trying to get response details when there are none: request id: ' + this.id)
      return []
    }

    let rows = this.response

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

  getGeometries () {
    if (!this.response) {
      logger.error('trying to get response details when there are none: request id: ' + this.id)
      return undefined
    }

    const geometryKey = this.getGeometryKey()

    const geometries = this.response.map(row => row.converted_row[geometryKey]).filter(geometry => geometry !== '')
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
      currentPage: pageNumber + 1,
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
  const left = current === count ? current - 2 * adjacent : max(1, current - adjacent)
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
