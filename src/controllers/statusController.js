import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import { finishedProcessingStatuses } from '../utils/utils.js'
import { headingTexts, messageTexts, buttonTexts, buttonAriaLabels } from '../content/statusPage.js'
import platformApi from '../services/platformApi.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { processSpecificationMiddlewares } from '../middleware/common.middleware.js'
import { shouldShowColumnMapping } from '../services/columnMappingDecider.js'

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
          const error = new Error(`Dataset not found: ${params.dataset}`)
          logger.warn('fetchDatasetPlatformInfo: no dataset returned', { type: types.App, dataset: params.dataset })
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
      req.form.options.showColumnMapping = req.form.options.processingComplete
        ? await shouldShowColumnMapping(req.form.options.data, req.uniqueDatasetFields || [])
        : false
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

export { shouldShowColumnMapping }

export default StatusController
