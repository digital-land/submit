import hmpoFormWizard from 'hmpo-form-wizard'
import { logPageView, types } from '../utils/logging.js'
import logger from '../utils/logger.js'
import { datasetSlugToReadableName } from '../utils/datasetSlugToReadableName.js'
const { Controller } = hmpoFormWizard

/**
 * If we arrived at the page via deep from another page, we'll use that page as the back link.
 *
 * @param {string} url current page URL
 * @param {{ referrer?: string, dataset: string }} deepLinkInfo deep link info from the session
 * @returns {string|undefined} back link URL
 */
function wizardBackLink (currentUrl, deepLinkInfo) {
  if (deepLinkInfo && 'referrer' in deepLinkInfo) {
    const { referrer, dataset } = deepLinkInfo
    if (dataset === 'tree' && currentUrl === '/check/geometry-type') {
      return referrer
    }
    if (dataset !== 'tree' && currentUrl === '/check/upload-method') {
      return referrer
    }
  }

  return undefined
}

class PageController extends Controller {
  checkToolDeepLinkSessionKey = 'check-tool-deep-link'

  get (req, res, next) {
    logPageView(this.options.route, req.sessionID, req.ip)
    super.get(req, res, next)
  }

  locals (req, res, next) {
    try {
      let backLink
      const deepLinkInfo = req?.sessionModel?.get(this.checkToolDeepLinkSessionKey)
      if (deepLinkInfo) {
        req.form.options.deepLink = deepLinkInfo
        req.form.options.datasetName = deepLinkInfo.datasetName
        backLink = wizardBackLink(req.originalUrl, deepLinkInfo)
      }

      if (backLink) {
        req.form.options.backLinkText = `Back to ${deepLinkInfo.datasetName} overview`
      }

      backLink = backLink ?? this.options.backLink
      if (backLink) {
        req.form.options.lastPage = backLink
      }
    } catch (e) {
      logger.warn('PageController.locals(): error setting back link', {
        type: types.App,
        errorMessage: e.message
      })
    }

    const dataset = req?.sessionModel?.get('dataset')
    try {
      req.form.options.datasetName = datasetSlugToReadableName(dataset)
    } catch (e) {
      logger.warn(`Failed to get readable dataset name from slug: ${dataset}`)
    }

    const errors = req?.sessionModel?.get('errors')
    if (errors) {
      req.form.options.errors = errors
    }

    super.locals(req, res, next)
  }
}

export default PageController
