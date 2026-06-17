import datasette from '../services/datasette.js'
import { isStatutoryDataset } from '../utils/redisLoader.js'
import { addQualityCriteriaLevels } from '../controllers/resultsController.js'

export async function shouldShowColumnMapping (requestData, uniqueDatasetFields = []) {
  if (!requestData?.isComplete?.() || requestData?.isFailed?.()) {
    return false
  }

  const params = requestData.getParams?.() ?? {}

  try {
    if (await isStatutoryDataset({
      organisation: params.organisationName,
      dataset: params.dataset
    })) {
      return false
    }
    if (await hasBlockingNonColumnMappingTasks(requestData)) return false

    let columnMapping = requestData.getColumnFieldLog?.() ?? []

    if (uniqueDatasetFields.length > 0) {
      columnMapping = columnMapping.filter(entry => uniqueDatasetFields.includes(entry?.field))
    }
    let allFieldsInDataset = columnMapping.map(column => column?.field).filter(Boolean)
    const geometryItem = columnMapping.find(column => column?.field?.toLowerCase() === 'geometry') ?? null
    const pointFieldItem = columnMapping.find(column => column?.field?.toLowerCase() === 'point') ?? null
    const geometryMapped = Boolean(geometryItem?.column)
    const pointMapped = Boolean(pointFieldItem?.column)
    if (geometryMapped && !pointMapped) {
      allFieldsInDataset = allFieldsInDataset.filter(field => field.toLowerCase() !== 'point')
    } else if (pointMapped && !geometryMapped) {
      allFieldsInDataset = allFieldsInDataset.filter(field => field.toLowerCase() !== 'geometry')
    }
    if (allFieldsInDataset.length === 0) return false

    const userColumnMapping = params.column_mapping ?? {}
    const hasUserColumnMapping = Object.values(userColumnMapping).some(value => Boolean(value))
    if (hasUserColumnMapping) return false

    const responseDetails = await requestData.fetchResponseDetails(0, 50)
    const rows = responseDetails.getRows?.() ?? []
    const fieldsMappedByUser = buildMappedFields(columnMapping, userColumnMapping)

    const unmappedDatasetFields = new Set(allFieldsInDataset.filter(field => !fieldsMappedByUser.has(field)))

    const hasUnmappedExpectedFields = unmappedDatasetFields.size > 0
    if (!hasUnmappedExpectedFields) return false

    const spareUploadedColumns = buildSpareUploadedColumns(columnMapping, rows, userColumnMapping)
    if (spareUploadedColumns.length === 0) return false

    const hasMissingMandatoryFields = columnMapping.some(column => column?.mandatory && !column?.column && !fieldsMappedByUser.has(column.field))
    if (hasMissingMandatoryFields) return true

    return hasUnmappedExpectedFields
  } catch {
    return false
  }
}

export async function hasBlockingNonColumnMappingTasks (requestData) {
  const issueTasks = requestData.getIssueTasks?.() ?? []
  if (issueTasks.length === 0) return false

  const { formattedData: issueTypes } = await datasette.runQuery(`
    select issue_type, quality_criteria_level
    from issue_type
  `)

  return addQualityCriteriaLevels(issueTasks, issueTypes).some(issue =>
    issue.responsibility !== 'internal' &&
    issue.quality_criteria_level === 2 &&
    !['missing column', 'missing-field'].includes(issue['issue-type'])
  )
}

function buildMappedFields (columnMapping = [], userColumnMapping = {}) {
  const fields = new Set()

  columnMapping.forEach(column => {
    if (column?.field && column?.column && !column?.missing) fields.add(column.field)
  })

  Object.values(userColumnMapping).forEach(field => {
    if (field && field !== 'IGNORE') fields.add(field)
  })

  return fields
}

function buildSpareUploadedColumns (columnMapping = [], rows = [], userColumnMapping = {}) {
  const mappedColumns = new Set(columnMapping.map(column => column?.column).filter(Boolean))
  Object.entries(userColumnMapping).forEach(([column, field]) => {
    if (field) mappedColumns.add(column)
  })

  const uploadedColumns = new Set()
  rows.forEach(row => {
    Object.keys(row?.converted_row ?? {}).forEach(column => uploadedColumns.add(column))
  })

  return [...uploadedColumns].filter(column => !mappedColumns.has(column))
}

export default {
  shouldShowColumnMapping,
  hasBlockingNonColumnMappingTasks
}
