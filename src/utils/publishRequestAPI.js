import config from '../../config/index.js'

export const postFileRequest = async (formData) => {
  const { uploadedFilename, originalFilename, dataset, collection, geomType } = formData

  return await postRequest({
    dataset,
    collection,
    geom_type: geomType,
    uploaded_filename: uploadedFilename,
    original_filename: originalFilename,
    type: 'check_file'
  })
}

export const postUrlRequest = async (formData) => {
  const { url, dataset, collection, geomType } = formData

  return await postRequest({
    dataset,
    collection,
    geom_type: geomType,
    url,
    type: 'check_url'
  })
}

const postRequest = async (formData) => {
  const response = await fetch(config.publishRequestApi, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  return data.id // assuming the response contains the id
}

export const getRequestData = async (resultId) => {
  const result = await fetch(`${config.publishRequestApi.url}/${config.publishRequestApi.requestsEndpoint}/${resultId}`)

  if (!result.ok) {
    if (result.status === 404) {
      throw new Error('Request not found')
    } else {
      throw new Error('Unexpected error')
    }
  }

  const resultJson = await result.json()
  return new RequestData(resultJson)
}

export class RequestData {
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
