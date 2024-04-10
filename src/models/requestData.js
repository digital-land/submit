import getVerboseColumns from '../utils/getVerboseColumns.js'

export default class RequestData {
  constructor (data) {
    Object.assign(this, data)
  }

  isFailed () {
    return this.status === 'FAILED'
  }

  getError () {
    if (this.response) {
      return this.response.error
    } else {
      return { message: 'An unknown error occurred.' }
    }
  }

  hasErrors () {
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
      return []
    }
    return this.response.details
  }

  getColumnFieldLog () {
    if (!this.response || !this.response.data || !this.response.data['column-field-log']) {
      return []
    }
    return this.response.data['column-field-log']
  }

  getGeometryKey () {
    if (!this.params) {
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

  getErrorSummary () {
    if (!this.response || !this.response.data || !this.response.data['error-summary']) {
      return []
    }
    return this.response.data['error-summary']
  }

  // This function returns an array of rows with verbose columns
  getRowsWithVerboseColumns (filterNonErrors = false) {
    if (!this.response || !this.response.details) {
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
    const geometryKey = this.getGeometryKey()
    const geometries = this.response.details.map(row => row.converted_row[geometryKey]).filter(geometry => geometry !== '')
    if (geometries.length === 0) {
      return null
    }
    return geometries
  }
}
