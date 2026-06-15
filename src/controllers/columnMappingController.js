import PageController from './pageController.js'
import { postCheckRequest } from '../services/asyncRequestApi.js'
import { isStatutoryDataset } from '../utils/redisLoader.js'
import { getRequestDataMiddleware, updateSessionFromRequestData } from './resultsController.js'
import { processSpecificationMiddlewares } from '../middleware/common.middleware.js'
import platformApi from '../services/platformApi.js'
import { types } from '../utils/logging.js'
import logger from '../utils/logger.js'

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
    // Populate req.params and dataset, then run specification processing middlewares
    this.use(async (req, res, next) => {
      const { requestData } = req.locals
      const params = requestData?.getParams() ?? {}
      try {
        const { formattedData } = await platformApi.fetchDatasets({ dataset: params.dataset })
        // Bounds check TODO move to external bounds handling as in fetchOne
        if (!formattedData || formattedData.length === 0) {
          const error = new Error(`Dataset not found: ${req.params.dataset}`)
          logger.warn('fetchDatasetPlatformInfo: no dataset returned', { type: types.App, dataset: req.params.dataset })
          return next(error)
        }
        const datasetInfo = formattedData[0]
        req.dataset = {
          collection: datasetInfo.collection,
          name: datasetInfo.name,
          dataset: datasetInfo.dataset,
          typology: datasetInfo.typology
        }
      } catch (error) {
        logger.warn('fetchDatasetPlatformInfo failed', { type: types.App, errorMessage: error.message, errorStack: error.stack })
        return next(error)
      }
      return next()
    })
    // attach the standard specification processing middleware chain
    processSpecificationMiddlewares.forEach(mw => this.use(mw))
  }

  async locals (req, res, next) {
    try {
      const { requestData } = req.locals
      if (!requestData) return

      if (requestData.isFailed()) {
        res.redirect(`/check/results/${req.params.id}/1`)
        return
      }
      const uniqueDatasetFields = req.uniqueDatasetFields || []
      Object.assign(req.form.options, await buildColumnMappingOptions({
        requestData,
        requestId: req.params.id,
        uniqueDatasetFields
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
        body: req.body,
        uniqueDatasetFields: req.uniqueDatasetFields || []
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
      const uniqueDatasetFields = req.uniqueDatasetFields || []
      const { detectedGeometryMapping } = await prepareColumnMappingContext(requestData, uniqueDatasetFields)
      const columnMapping = buildSubmittedColumnMapping({
        existingMapping: {
          ...(params.column_mapping ?? {}),
          ...detectedGeometryMapping
        },
        body: req.body
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
async function buildColumnMappingOptions ({ requestData, requestId, body = {}, validationErrors = {}, uniqueDatasetFields = [] }) {
  const {
    columnMappingRows,
    specFields,
    requiredFields,
    responseRows
  } = await prepareColumnMappingContext(requestData, uniqueDatasetFields)
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
    uploadedColumns: buildSelectableColumns(columnMappingRows, responseRows),
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
async function prepareColumnMappingContext (requestData, uniqueDatasetFields = []) {
  let columnFieldLog = requestData.getColumnFieldLog()
  if (uniqueDatasetFields.length > 0) {
    columnFieldLog = columnFieldLog.filter(entry => uniqueDatasetFields.includes(entry?.field))
  }
  const responseDetails = await requestData.fetchResponseDetails(0, 50)
  const responseRows = responseDetails.getRows()
  const detectedGeometryMapping = detectGeometryColumnMapping(columnFieldLog, responseRows)
  columnFieldLog = applyDetectedGeometryColumnMapping(columnFieldLog, responseRows)

  const params = requestData.getParams() ?? {}
  const userColumnMapping = params.column_mapping ?? {}
  const columnMappingRows = buildColumnMappingRows({
    columnFieldLog,
    userColumnMapping
  })

  const specFields = buildSpecFields(columnFieldLog.map(entry => entry?.field).filter(Boolean))
  const requiredFields = columnFieldLog.filter(entry => entry?.mandatory).map(entry => entry.field)
  return {
    columnMappingRows,
    specFields,
    requiredFields,
    responseRows,
    detectedGeometryMapping
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
  const fieldMap = getBracketFields(body, 'fieldMap')

  // base errors: missing or explicit 'na' for required fields
  const errors = Object.fromEntries(
    Object.entries(fieldMap)
      .filter(([field, value]) => value === '')
      .map(([field]) => [field, {
        text: `Select the ${field} field`
      }])
  )

  // check for duplicate selections (same column selected for multiple fields)
  const selections = Object.entries(fieldMap)
    .map(([field, value]) => [field, (value ?? '').trim()])
    .filter(([, col]) => col && col !== 'na')

  const counts = selections.reduce((acc, [, col]) => {
    acc[col] = (acc[col] || 0) + 1
    return acc
  }, {})

  for (const [field, col] of selections) {
    if (counts[col] > 1 && !errors[field]) {
      errors[field] = { text: `${col} has been selected more than once` }
    }
  }

  return errors
}

export function applySubmittedFieldSelections (mappingRows = [], body = {}) {
  const fieldMap = getBracketFields(body, 'fieldMap')
  mappingRows.forEach(row => {
    if (Object.hasOwn(fieldMap, row.field)) {
      const selectedColumn = (fieldMap[row.field] ?? '').trim()
      row.userIgnored = selectedColumn === 'na'
      row.column = row.userIgnored ? '' : selectedColumn
    }
  })
}

export function buildSubmittedColumnMapping ({ existingMapping = {}, body = {}, spareUploadedColumns = [] }) {
  const columnMapping = { ...existingMapping }
  const columns = Array.isArray(body.columns)
    ? body.columns
    : body.columns
      ? [body.columns]
      : []
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

    columnMapping[column] = column === 'na' ? 'IGNORE' : field
    selectedUploadedColumns.add(column)
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

export function buildColumnMappingRows ({ columnFieldLog = [], userColumnMapping = {} }) {
  const entries = columnFieldLog
  const rows = []

  entries.forEach(entry => {
    const column = entry?.column
    if (!column) {
      if (entry?.field) {
        rows.push({
          column: '',
          field: entry.field,
          isMapped: false,
          isMissing: entry.missing,
          userDefined: false,
          userIgnored: false
        })
      }
      return
    }

    const userMappedField = userColumnMapping[column]
    const isDetectedGeometryMapping = entry?.detectedGeometryMapping === true
    const field = entry.field
    const isMapped = Boolean(field) && Boolean(column)
    rows.push({
      column,
      field,
      isMapped,
      isAutoMapped: isMapped && !userMappedField && !isDetectedGeometryMapping,
      isMissing: entry.missing,
      userDefined: Boolean(userMappedField || isDetectedGeometryMapping)
    })
  })

  if (Object.keys(userColumnMapping).length > 0) {
    rows.forEach(row => {
      if (!row.column) {
        row.userIgnored = true
      }
    })
  }

  return rows
}

export function applyDetectedGeometryColumnMapping (columnFieldLog = [], responseRows = []) {
  const detectedMapping = detectGeometryColumnMapping(columnFieldLog, responseRows)
  if (Object.keys(detectedMapping).length === 0) return columnFieldLog

  const [[detectedColumn, detectedField]] = Object.entries(detectedMapping)
  return columnFieldLog.map(entry => {
    if (entry?.field !== detectedField) return entry

    return {
      ...entry,
      column: detectedColumn,
      detectedGeometryMapping: true,
      missing: false
    }
  })
}

export function detectGeometryColumnMapping (columnFieldLog = [], responseRows = []) {
  const geometryFields = ['geometry', 'point']
  const expectedGeometryFields = new Set(
    columnFieldLog
      .map(entry => entry?.field)
      .filter(field => geometryFields.includes(field))
  )

  if (expectedGeometryFields.size === 0) return {}

  const alreadyMapped = columnFieldLog.some(entry =>
    geometryFields.includes(entry?.field) && Boolean(entry?.column)
  )
  if (alreadyMapped) return {}

  const detectedMapping = detectGeometryColumnFromFirstRow(responseRows, expectedGeometryFields)
  if (!detectedMapping) return {}

  return {
    [detectedMapping.column]: detectedMapping.field
  }
}

export function detectGeometryColumnFromFirstRow (responseRows = [], expectedFields = new Set(['geometry', 'point'])) {
  const firstRow = responseRows[0]?.converted_row ?? {}

  for (const [column, value] of Object.entries(firstRow)) {
    const field = getGeometryFieldForValue(value)
    if (field && expectedFields.has(field)) {
      return { column, field }
    }
  }

  return null
}

function getGeometryFieldForValue (value) {
  if (typeof value !== 'string') return null

  const normalisedValue = value.trimStart().toUpperCase()
  if (normalisedValue.startsWith('POINT')) return 'point'
  if (normalisedValue.startsWith('POLYGON') || normalisedValue.startsWith('MULTIPOLYGON')) return 'geometry'
  return null
}

// selectable columns are converted rows that have not been auto-mapped by the system
export function buildSelectableColumns (columnMappingRows = [], responseRows = []) {
  const autoMappedColumns = new Set(columnMappingRows.filter(row => row.isAutoMapped).map(row => row.column).filter(Boolean))
  const unmappedColumns = new Set()
  responseRows.forEach(row => {
    Object.keys(row?.converted_row ?? {}).forEach(column => {
      if (!autoMappedColumns.has(column)) unmappedColumns.add(column)
    })
  })
  return [...unmappedColumns].sort()
}

export function buildExpectedFieldRows ({ columnMappingRows = [], specFields = [], requiredFields = [] }) {
  const requiredFieldSet = new Set(requiredFields)

  let rows = specFields.map(field => {
    const mappedRow = columnMappingRows.find(row => row.field === field && row.isMapped && !row.userIgnored)
    const ignoredRow = columnMappingRows.find(row => row.field === field && row.userIgnored)

    const isAutoMapped = Boolean(mappedRow?.isMapped) && !mappedRow?.userDefined
    return {
      field,
      column: mappedRow?.column ?? '',
      isMapped: Boolean(mappedRow?.column),
      isAutoMapped,
      userDefined: Boolean(mappedRow?.userDefined), // if the user has explicitly mapped this field
      userIgnored: Boolean(ignoredRow),
      isEditable: !isAutoMapped, // shows as dropdown in the UI and also shows as an Unmapped badge
      isRequired: requiredFieldSet.has(field)
    }
  })

  // Business rule: geometry and point are mutually exclusive when one is already mapped.
  // - If `geometry` is mapped and `point` is not, hide the `point` option.
  // - If `point` is mapped and `geometry` is not, hide the `geometry` option.
  // - If both are mapped or both are unmapped, leave both rows as-is.
  const geometryRow = rows.find(r => r.field === 'geometry')
  const pointRow = rows.find(r => r.field === 'point')
  const geometryMapped = Boolean(geometryRow && geometryRow.isMapped && !geometryRow.userIgnored)
  const pointMapped = Boolean(pointRow && pointRow.isMapped && !pointRow.userIgnored)
  if (geometryMapped && !pointMapped) {
    rows = rows.filter(r => r.field !== 'point')
  } else if (pointMapped && !geometryMapped) {
    rows = rows.filter(r => r.field !== 'geometry')
  }

  return rows.sort((a, b) => {
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
