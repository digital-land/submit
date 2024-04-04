export default class RequestData {
  constructor (data) {
    Object.assign(this, data)
  }

  isFailed () {
    return this.status === 'FAILED'
  }

  getError () {
    return this.response.error
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
    if (!this.request || !this.request.geom_type) {
      return null
    }

    const geometryType = this.request.geom_type
    const columnFieldLog = this.getColumnFieldLog()

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
    return this.request
  }

  getErrorSummary () {
    if (!this.response || !this.response.data || !this.response.data['error-summary']) {
      return []
    }
    return this.response.data['error-summary']
  }

  // This function returns an array of rows with verbose columns
  getRowsWithVerboseColumns () {
    // This function processes a row and returns verbose columns
    const getVerboseColumns = (row) => {
      const columnFieldLog = this.response.data['column-field-log']
      if (!columnFieldLog || !row.issue_logs) {
        throw new Error('Invalid row data, missing column-field-log or issue_logs')
      }
      // Process the row and return verbose columns
      return processRow(row, columnFieldLog)
    }

    // This function processes a row and returns verbose values
    const processRow = (row, columnFieldLog) => {
      const valuesAsArray = Object.entries(row.converted_row)
      const verboseValuesAsArray = valuesAsArray.map(([key, value]) => processKeyValue(key, value, row, columnFieldLog))
      // Reduce verbose values to handle duplicate keys
      return reduceVerboseValues(verboseValuesAsArray)
    }

    // This function processes a key-value pair and returns a verbose value
    const processKeyValue = (key, value, row, columnFieldLog) => {
      const columnField = columnFieldLog.find(column => column.column === key)
      const field = columnField ? columnField.field : key
      // If the column field is missing, set the error to 'missing value', otherwise find the error in issue_logs
      const error = columnField && columnField.missing ? 'missing value' : row.issue_logs.find(error => error.field === field)
      // Return the verbose value
      return [field, { value, column: key, field, error }]
    }

    // This function reduces verbose values to handle duplicate keys
    const reduceVerboseValues = (verboseValuesAsArray) => {
      return verboseValuesAsArray.reduce((acc, [key, value]) => {
        if (key in acc) {
          // If both the existing and new values are not null and they are different, log a message
          if (value.value && acc[key].value && value.value !== acc[key].value) {
            // ToDo: we need to handle this case
            console.log(`Duplicate keys with different values: ${key}`)
            // If the new value is not null, replace the existing value and log a message
          } else if (value.value) {
            acc[key] = value
            console.log(`Duplicate key found, keeping the one with value: ${key}`)
          }
        // If the key does not exist in the accumulator, add it
        } else {
          acc[key] = value
        }
        // Return the accumulator
        return acc
      }, {})
    }

    if (!this.response || !this.response.details) {
      return []
    }

    // Map over the details in the response and return an array of rows with verbose columns
    return this.response.details.map(row => ({
      entryNumber: row.entry_number,
      hasErrors: row.issue_logs.filter(issue => issue.severity === 'error').length > 0,
      columns: getVerboseColumns(row)
    }))
  }

  getGeometries () {
    const geometryKey = this.getGeometryKey()
    const geometries = this.response.details.map(row => row.converted_row[geometryKey]).filter(geometry => geometry !== '')
    if (geometries.length === 0) {
      return null
    }
  }
}
