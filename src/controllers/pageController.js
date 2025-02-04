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

/**
 * This class extends the Controller class from the hmpo-form-wizard library.
 * For more information, please refer to the documentation:
 * https://github.com/HMPO/hmpo-form-wizard
 * Specifically, the controller lifecycle is outlined in this PDF:
 * https://github.com/UKHomeOffice/passports-form-wizard/wiki/HMPO%20Forms%20Flow.pdf
 */
class PageController extends Controller {
  sessionKey = 'deep-link-session-key'

  get (req, res, next) {
    logPageView(this.options.route, req.sessionID, req.ip)
    super.get(req, res, next)
  }

  locals (req, res, next) {
    try {
      let backLink
      const deepLinkInfo = req?.sessionModel?.get(this.sessionKey)
      if (deepLinkInfo) {
        req.form.options.deepLink = deepLinkInfo
        req.form.options.dataset = deepLinkInfo.dataset
        req.form.options.datasetName = deepLinkInfo.datasetName
        req.form.options.lpa = deepLinkInfo.lpa
        req.form.options.orgId = deepLinkInfo.orgId
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
