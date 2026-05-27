import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import { finishedProcessingStatuses } from '../utils/utils.js'
import { headingTexts, messageTexts, buttonTexts, buttonAriaLabels } from '../content/statusPage.js'
import { getDatasetFields, isStatutoryDataset } from '../utils/redisLoader.js'

/**
 * Attempts to infer how we ended up on this page.
 *
 * @param req
 * @returns {string?}
 */
function getLastPage (req) {
  let lastPage
  if ('url' in req.form.options.data.params) {
    lastPage = '/check/url'
  } else if ('original_filename' in req.form.options.data.params) {
    lastPage = '/check/upload'
  }
  return lastPage
}

class StatusController extends PageController {
  async post (req, res, next) {
    try {
      const requestData = await getRequestData(req.params.id)
      const nextStep = await shouldShowColumnMapping(requestData)
        ? `/check/column-mapping/${req.params.id}`
        : `/check/results/${req.params.id}/1`

      res.redirect(nextStep)
    } catch (error) {
      next(error)
    }
  }

  async locals (req, res, next) {
    try {
      req.form.options.data = await getRequestData(req.params.id)
      req.form.options.processingComplete = finishedProcessingStatuses.includes(req.form.options.data.status)
      req.form.options.headingTexts = headingTexts
      req.form.options.messageTexts = messageTexts
      req.form.options.buttonTexts = buttonTexts
      req.form.options.buttonAriaLabels = buttonAriaLabels
      req.form.options.pollingEndpoint = `/api/status/${req.form.options.data.id}`
      const now = new Date()
      req.form.options.lastUpdated = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).replace(' ', '').toLowerCase() +
        ' on ' +
        now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
      const lastPage = getLastPage(req)
      if (lastPage) {
        req.form.options.lastPage = lastPage
      }
      super.locals(req, res, next)
    } catch (error) {
      next(error, req, res, next)
    }
  }
}

export async function shouldShowColumnMapping (requestData) {
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

    const expectedFields = await getDatasetFields(params.dataset)
    if (expectedFields.length === 0) return false

    const columnFieldLog = requestData.getColumnFieldLog?.() ?? []
    const userColumnMapping = params.column_mapping ?? {}
    const responseDetails = await requestData.fetchResponseDetails(0, 50)
    const rows = responseDetails.getRows?.() ?? []

    const mappedFields = buildMappedFields(columnFieldLog, userColumnMapping)
    const unmappedExpectedFields = new Set(expectedFields.filter(field => !mappedFields.has(field)))
    const hasUnmappedExpectedFields = unmappedExpectedFields.size > 0
    if (!hasUnmappedExpectedFields) return false

    // If there are other blocking external errors, users should resolve those in
    // results instead of being redirected to column-mapping.
    const hasOtherBlockingExternalErrors = rows.some(row =>
      (row?.issue_logs ?? []).some(issue =>
        issue?.severity === 'error' &&
        issue?.responsibility === 'external' &&
        !unmappedExpectedFields.has(issue?.field)
      )
    )
    if (hasOtherBlockingExternalErrors) return false

    const spareUploadedColumns = buildSpareUploadedColumns(columnFieldLog, rows, userColumnMapping)
    return spareUploadedColumns.length > 0
  } catch {
    return false
  }
}

function buildMappedFields (columnFieldLog = [], userColumnMapping = {}) {
  const fields = new Set()

  columnFieldLog.forEach(column => {
    if (column?.field && column?.column && !column?.missing) fields.add(column.field)
  })

  Object.values(userColumnMapping).forEach(field => {
    if (field && field !== 'IGNORE') fields.add(field)
  })

  return fields
}

function buildSpareUploadedColumns (columnFieldLog = [], rows = [], userColumnMapping = {}) {
  const mappedColumns = new Set(columnFieldLog.map(column => column?.column).filter(Boolean))
  Object.entries(userColumnMapping).forEach(([column, field]) => {
    if (field) mappedColumns.add(column)
  })

  const uploadedColumns = new Set()
  rows.forEach(row => {
    Object.keys(row?.converted_row ?? {}).forEach(column => uploadedColumns.add(column))
  })

  return [...uploadedColumns].filter(column => !mappedColumns.has(column))
}

export default StatusController
