export default class RequestData {
  constructor (data) {
    Object.assign(this, data)
  }

  hasErrors () {
    return this.response.data.error_summary.length > 0
  }

  isComplete () {
    return this.status === 'COMPLETE'
  }

  getRows () {
    return this.response.details
  }

  getColumnFieldLog () {
    return this.response.data.column_field_log
  }

  getGeometryKey () {
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

  getColumns () {
    return this.getColumnFieldLog().map(column => column.column)
  }

  getFields () {
    return this.getColumnFieldLog().map(column => column.field)
  }

  getParams () {
    return this.request
  }

  getErrorSummary () {
    return this.response.data.error_summary
  }

  // this method will return verbose information on the columns for each row,
  // as well as the basic information on each row this will include...
  // - value errors
  // - field name and column name
  getRowsWithVerboseColumns () {
    const getVerboseColumns = (row) => {
      const columnFieldLog = this.response.data.column_field_log
      // for each key value in converted row, return a new key value pair with the key staying the same and the value being an object
      const valuesASArray = Object.entries(row.converted_row)
      const verboseValuesAsArray = valuesASArray.map(([key, value]) => {
        const issueLogRow = row.issue_logs

        if (!columnFieldLog || !issueLogRow) {
          throw new Error('Invalid row data, missing column_field_log or issue_logs')
        }

        const columnField = columnFieldLog.find(column => column.column === key)
        let field
        let error
        if (!columnField) {
          field = key
          // throw new Error(`No column field found for key: ${key} in the column_field_log`)
        } else {
          field = columnField.field
          if (columnField.missing) {
            error = 'missing value'
          }
        }

        error = issueLogRow.find(error => error.field === field)

        return [key, {
          value,
          column: key,
          field,
          error
        }]
      })
      const verboseValues = Object.fromEntries(verboseValuesAsArray)
      return verboseValues
    }

    return this.response.details.map(row => {
      return {
        entryNumber: row.entry_number,
        hasErrors: row.issue_logs.length > 0,
        columns: getVerboseColumns(row)
      }
    })
  }

  getGeometries () {
    const geometryKey = this.getGeometryKey()
    return this.response.details.map(row => row.converted_row[geometryKey])
  }
}
