export default class RequestData {
  constructor (data) {
    Object.assign(this, data)
  }

  hasErrors () {
    return this.response.data['error-summary'].length > 0
  }

  isComplete () {
    return this.status === 'COMPLETE'
  }

  getRows () {
    return this.response.details
  }

  getColumnFieldLog () {
    return this.response.data['column-field-log']
  }

  getGeometryKey () {
    const geometryType = this.params.geom_type
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
    return this.params
  }

  getErrorSummary () {
    return this.response.data['error-summary']
  }

  // this method will return verbose information on the columns for each row,
  // as well as the basic information on each row this will include...
  // - value errors
  // - field name and column name
  getRowsWithVerboseColumns () {
    const getVerboseColumns = (row) => {
      Object.fromEntries(
        Object.entries(row['converted-row']).map(([key, value]) => {
          const columnFieldLog = row['column-field-log']
          const issueLogRow = row['issue-log-row']

          if (!columnFieldLog || !issueLogRow) {
            throw new Error('Invalid row data, missing column-field-log or issue-log-row')
          }

          const columnField = columnFieldLog.find(column => column.column === key)
          if (!columnField) {
            throw new Error(`No column field found for key: ${key} in the column-field-log`)
          }

          const field = columnField.field
          const error = issueLogRow.find(error => error.field === field)

          return [key, {
            value,
            column: key,
            field,
            error
          }]
        })
      )
    }

    return this.response.details.map(row => {
      return {
        lineNumber: row['line-number'],
        columns: getVerboseColumns(row)
      }
    })
  }
}
