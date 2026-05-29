import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import { finishedProcessingStatuses } from '../utils/utils.js'
import { headingTexts, messageTexts, buttonTexts, buttonAriaLabels } from '../content/statusPage.js'
import { isStatutoryDataset } from '../utils/redisLoader.js'
import platformApi from '../services/platformApi.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { processSpecificationMiddlewares } from '../middleware/common.middleware.js'

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
  middlewareSetup () {
    super.middlewareSetup()
    // Populate req.params and dataset, then run specification processing middlewares
    this.use(async (req, res, next) => {
      const requestData = await getRequestData(req.params.id)
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

  async post (req, res, next) {
    try {
      const requestData = await getRequestData(req.params.id)
      const uniqueDatasetFields = req.uniqueDatasetFields || []
      const nextStep = await shouldShowColumnMapping(requestData, uniqueDatasetFields)
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

    let columnMapping = requestData.getColumnFieldLog?.() ?? []

    if (uniqueDatasetFields.length > 0) {
      columnMapping = columnMapping.filter(entry => uniqueDatasetFields.includes(entry?.field))
    }
    let allFieldsInDataset = columnMapping.map(column => column?.field).filter(Boolean)
    // filter out point or geometry field depending on which is present.
    // If geometry is mapped, do not show point. If point is mapped, do not show geometry.
    // If both are mapped, no action needed. If neither are mapped, show both options
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

    // the column mapping the user has done
    const userColumnMapping = params.column_mapping ?? {}
    const responseDetails = await requestData.fetchResponseDetails(0, 50)
    const rows = responseDetails.getRows?.() ?? []
    // all the columns the user has mapped.
    const fieldsMappedByUser = buildMappedFields(columnMapping, userColumnMapping)

    // all the fields in the dataset that has not been mapped
    const unmappedDatasetFields = new Set(allFieldsInDataset.filter(field => !fieldsMappedByUser.has(field)))

    const hasUnmappedExpectedFields = unmappedDatasetFields.size > 0
    // there are no dataset fields that are unmapped, so no need to show column mapping page
    if (!hasUnmappedExpectedFields) return false

    // the uploaded columns that have not been mapped either automatically or by the user (they are available for mapping)
    const spareUploadedColumns = buildSpareUploadedColumns(columnMapping, rows, userColumnMapping)

    // if there are no uploaded columns that can be mapped, then there is no point showing the column mapping page
    if (spareUploadedColumns.length === 0) return false

    // if there are missing mandatory fields that are not mapped by the user, then we should show the column mapping page
    const hasMissingMandatoryFields = columnMapping.some(column => column?.mandatory && !column?.column && !fieldsMappedByUser.has(column.field))
    if (hasMissingMandatoryFields) return true

    // if has unmapped required fields
    const hasOtherBlockingExternalErrors = requestData.getIssueTasks().some(issue =>
      issue.severity === 'error' &&
      issue.responsibility === 'external' &&
      issue['issue-type'] !== 'missing-field'
    )
    return !hasOtherBlockingExternalErrors
  } catch {
    return false
  }
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

// uploaded columns that have not been mapped either automatically or by the user (they are available for mapping)
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

export default StatusController
