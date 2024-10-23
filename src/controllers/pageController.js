import hmpoFormWizard from 'hmpo-form-wizard'
import { logPageView } from '../utils/logging.js'
const { Controller } = hmpoFormWizard

/**
 * If we arrived at the page via deep from another page, we'll use that page as the back link.
 *
 * @param {string} url current page URL
 * @param {{ referer?: string, dataset: string }} deepLinkInfo deep link info from the session
 * @returns {string|undefined} back link URL
 */
function wizardBackLink (currentUrl, deepLinkInfo) {
  if (deepLinkInfo && 'referer' in deepLinkInfo) {
    const { referer, dataset } = deepLinkInfo
    if (dataset === 'tree' && currentUrl === '/check/geometry-type') {
      return referer
    }
    if (dataset !== 'tree' && currentUrl === '/check/upload-method') {
      return referer
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
    let backLink
    const deepLinkInfo = req?.sessionModel?.get(this.checkToolDeepLinkSessionKey)
    if (deepLinkInfo) {
      req.form.options.deepLink = deepLinkInfo
      backLink = wizardBackLink(req.originalUrl, deepLinkInfo)
    }

    backLink = backLink ?? this.options.backLink
    if (backLink) {
      req.form.options.lastPage = backLink
    }
    super.locals(req, res, next)
  }
}

export default PageController
