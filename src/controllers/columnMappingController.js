import PageController from './pageController.js'
import config from '../../config/index.js'
import { postCheckRequest } from '../services/asyncRequestApi.js'
import { getDatasetFields, isStatutoryDataset } from '../utils/redisLoader.js'
import { getRequestDataMiddleware, updateSessionFromRequestData } from './resultsController.js'

class ColumnMappingController extends PageController {
  middlewareSetup () {
    super.middlewareSetup()
    this.use(getRequestDataMiddleware)
    this.use(async (req, res, next) => {
      const { requestData } = req.locals
      const params = requestData.getParams() ?? {}
      if (await isStatutoryDataset(params.organisationName, params.dataset)) {
        return res.status(404).render('errors/404.html')
      }
      next()
    })
    this.use(updateSessionFromRequestData)
  }

  async locals (req, res, next) {
    try {
      const { requestData } = req.locals
      if (!requestData) return

      if (requestData.isFailed()) {
        res.redirect(`/check/results/${req.params.id}/1`)
        return
      }

      Object.assign(req.form.options, await buildColumnMappingOptions({
        requestData,
        requestId: req.params.id
      }))
      super.locals(req, res, next)
    } catch (error) {
      next(error)
    }
  }

  async post (req, res, next) {
    try {
      const requestData = await getCompletedRequestData(req, res)
      if (!requestData) return

      const options = await buildColumnMappingOptions({
        requestData,
        requestId: req.params.id,
        body: req.body
      })
      const validationErrors = validateColumnMapping(req.body, options.mappingRows)
      if (Object.keys(validationErrors).length > 0) {
        options.columnMappingErrors = validationErrors
        Object.assign(req.form.options, options)
        Object.assign(res.locals, {
          options: req.form.options,
          errors: {}
        })
        res.status(400)
        res.render('check/column-mapping.html')
        return
      }

      const params = requestData.getParams() ?? {}
      const { columnMappingRows } = await prepareColumnMappingContext(requestData)
      const spareUploadedColumns = buildSelectableColumns(columnMappingRows)
      const columnMapping = buildSubmittedColumnMapping({
        existingMapping: params.column_mapping,
        body: req.body,
        spareUploadedColumns
      })

      const newRequestId = await postCheckRequest({
        ...params,
        column_mapping: Object.keys(columnMapping).length > 0 ? columnMapping : null
      })

      req.sessionModel.set('request_id', newRequestId)
      res.redirect(`/check/status/${newRequestId}`)
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Build the options object passed to the column-mapping template.
 * Returns UI-friendly data including expected mapping rows, selectable uploaded
 * columns and any validation errors so the view can render the mapping form.
 */
async function buildColumnMappingOptions ({ requestData, requestId, body = {}, validationErrors = {} }) {
  const {
    columnMappingRows,
    specFields,
    requiredFields
  } = await prepareColumnMappingContext(requestData)
  const mappingRows = buildExpectedFieldRows({
    columnMappingRows,
    specFields,
    requiredFields
  })

  applySubmittedFieldSelections(mappingRows, body)

  return {
    id: requestId,
    requestParams: requestData.getParams(),
    mappingRows,
    uploadedColumns: buildSelectableColumns(columnMappingRows),
    columnMappingErrors: validationErrors,
    lastPage: `/check/status/${requestId}`
  }
}

/**
 * Prepare the low-level data required to build the column mapping UI.
 *
 * - Fetches response details and the column-field detection log from `requestData`.
 * - Builds `columnMappingRows` (combined auto-detected + user overrides).
 * - Resolves `specFields` from the dataset and `requiredFields` from config.
 */
async function prepareColumnMappingContext (requestData) {
  const responseDetails = await requestData.fetchResponseDetails(0, 50)
  const columnFieldLog = requestData.getColumnFieldLog()
  const params = requestData.getParams() ?? {}
  const userColumnMapping = params.column_mapping ?? {}
  const columnMappingRows = buildColumnMappingRows({
    columnFieldLog,
    responseRows: responseDetails.getRows(),
    userColumnMapping
  })
  const specFields = buildSpecFields(await getDatasetFields(params.dataset))
  const requiredFields = config.datasetsConfig?.[params.dataset]?.requiredFields ?? []
  return {
    columnMappingRows,
    specFields,
    requiredFields
  }
}

async function getCompletedRequestData (req, res) {
  const { requestData } = req.locals
  if (!requestData) {
    return null
  }
  if (!requestData.isComplete()) {
    res.redirect(`/check/status/${req.params.id}`)
    return null
  }
  return requestData
}

export function validateColumnMapping (body = {}, mappingRows = []) {
  const requiredFields = new Set(mappingRows.filter(row => row.isRequired).map(row => row.field))

  return Object.fromEntries(
    Object.entries(getBracketFields(body, 'fieldMap'))
      .filter(([field, value]) => value === '' || (value === 'na' && requiredFields.has(field)))
      .map(([field]) => [field, {
        text: `Select the ${field} field`
      }])
  )
}

export function applySubmittedFieldSelections (mappingRows = [], body = {}) {
  const fieldMap = getBracketFields(body, 'fieldMap')
  mappingRows.forEach(row => {
    if (Object.hasOwn(fieldMap, row.field)) {
      row.column = fieldMap[row.field]
    }
  })
}

export function buildSubmittedColumnMapping ({ existingMapping = {}, body = {}, spareUploadedColumns = [] }) {
  const columnMapping = { ...existingMapping }
  const columns = Array.isArray(body.columns) ? body.columns : [body.columns].filter(Boolean)
  const selectedUploadedColumns = new Set()

  columns.forEach((column, index) => {
    const field = body[`field-${index}`]?.trim()
    const status = body[`status-${index}`]

    if (status === 'ignore') {
      columnMapping[column] = 'IGNORE'
    } else if (status === 'unmap') {
      delete columnMapping[column]
    } else if (field) {
      columnMapping[column] = field
    }
  })

  for (const [column, fieldValue] of Object.entries(getBracketFields(body, 'map'))) {
    const field = fieldValue?.trim()
    if (field === 'IGNORE') {
      columnMapping[column] = 'IGNORE'
    } else if (field) {
      columnMapping[column] = field
    }
  }

  for (const [column, value] of Object.entries(getBracketFields(body, 'unmap'))) {
    if (value === 'yes') {
      delete columnMapping[column]
    }
  }

  for (const [field, columnValue] of Object.entries(getBracketFields(body, 'fieldMap'))) {
    const column = columnValue?.trim()
    if (!column) continue

    for (const [mappedColumn, mappedField] of Object.entries(columnMapping)) {
      if (mappedField === field) delete columnMapping[mappedColumn]
    }
    if (column !== 'na') {
      columnMapping[column] = field
      selectedUploadedColumns.add(column)
    }
  }

  spareUploadedColumns.forEach(column => {
    if (!selectedUploadedColumns.has(column) && !columnMapping[column]) {
      columnMapping[column] = 'IGNORE'
    }
  })

  return Object.fromEntries(
    Object.entries(columnMapping).filter(([, field]) => field)
  )
}

export function getBracketFields (body = {}, fieldName) {
  const values = { ...(body[fieldName] ?? {}) }
  const prefix = `${fieldName}[`

  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith(prefix) && key.endsWith(']')) {
      values[key.slice(prefix.length, -1)] = value
    }
  }

  return values
}

export function buildSpecFields (datasetFields = []) {
  const fields = new Set(datasetFields)
  return [...fields].sort()
}

/**
 * Build the canonical list of column mapping rows.
 *
 * Each row describes an uploaded column and how it relates to a spec field:
 * - `column`: uploaded column name (empty string for missing auto-detected fields)
 * - `field`: mapped spec field (if any)
 * - `isMapped`, `isAutoMapped`, `isMissing`, `userDefined`, `userIgnored`
 *
 * @param {Object} options
 * @param {Array} options.columnFieldLog - auto-detected column->field log entries
 * @param {Array} options.responseRows - sample response rows with `converted_row` keys
 * @param {Object} options.userColumnMapping - existing user mapping overrides
 * @returns {Array} rows suitable for UI consumption
 */
export function buildColumnMappingRows ({ columnFieldLog = [], responseRows = [], userColumnMapping = {} }) {
  const mappedColumns = new Set()
  const rows = []

  columnFieldLog.forEach(entry => {
    const column = entry?.column
    if (!column) {
      if (entry?.field && entry?.missing) {
        rows.push({
          column: '',
          field: entry.field,
          isMapped: false,
          isMissing: true,
          userDefined: false,
          userIgnored: false
        })
      }
      return
    }

    mappedColumns.add(column)
    const userMappedField = userColumnMapping[column]
    const userIgnored = userMappedField === 'IGNORE'
    const field = userIgnored ? '' : userMappedField || entry.field || ''

    rows.push({
      column,
      field,
      isMapped: Boolean(field) && !entry.missing,
      isAutoMapped: Boolean(entry.field) && !userMappedField && !entry.missing,
      isMissing: Boolean(entry.missing),
      userDefined: Boolean(userMappedField) && !userIgnored,
      userIgnored
    })
  })

  const unmappedColumns = new Set()
  responseRows.forEach(row => {
    Object.keys(row?.converted_row ?? {}).forEach(column => {
      if (!mappedColumns.has(column)) unmappedColumns.add(column)
    })
  })

  const sortedUnmappedColumns = [...unmappedColumns].sort()
  sortedUnmappedColumns.forEach(column => {
    rows.push({
      column,
      field: userColumnMapping[column] === 'IGNORE' ? '' : userColumnMapping[column] || '',
      isMapped: Boolean(userColumnMapping[column]) && userColumnMapping[column] !== 'IGNORE',
      isAutoMapped: false,
      isMissing: false,
      userDefined: Boolean(userColumnMapping[column]) && userColumnMapping[column] !== 'IGNORE',
      userIgnored: userColumnMapping[column] === 'IGNORE'
    })
  })

  return rows
}

export function buildSelectableColumns (columnMappingRows = []) {
  return [...new Set(
    columnMappingRows
      .filter(row => row.userDefined || !row.isMapped)
      .map(row => row.column)
      .filter(Boolean)
  )].sort()
}

export function buildExpectedFieldRows ({ columnMappingRows = [], specFields = [], requiredFields = [] }) {
  const requiredFieldSet = new Set(requiredFields)

  return specFields.map(field => {
    const row = columnMappingRows.find(row => row.field === field && row.isMapped && !row.userIgnored)
    const isAutoMapped = Boolean(row?.isMapped) && !row?.userDefined
    return {
      field,
      column: row?.column ?? '',
      isMapped: Boolean(row?.column),
      isAutoMapped,
      userDefined: Boolean(row?.userDefined), // if the user has explicitly mapped this field
      isEditable: !isAutoMapped, // shows as dropdown in the UI and also shows as an Unmapped badge
      isRequired: requiredFieldSet.has(field)
    }
  }).sort((a, b) => {
    const rank = (row) => {
      if (row.isAutoMapped && row.isRequired) return 0
      if (row.isAutoMapped && !row.isRequired) return 1
      if (row.userDefined && row.isRequired) return 2
      if (!row.isMapped && row.isRequired) return 3
      if (row.userDefined && !row.isRequired) return 4
      return 5
    }

    if (rank(a) !== rank(b)) return rank(a) - rank(b)
    return a.field.localeCompare(b.field)
  })
}

export default ColumnMappingController
