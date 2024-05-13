import getVerboseColumns from '../utils/getVerboseColumns.js'
import logger from '../utils/logger.js'

export default class ResponseDetails {
  constructor (response) {
    this.response = response
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
}
