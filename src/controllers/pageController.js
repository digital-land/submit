import hmpoFormWizard from 'hmpo-form-wizard'
import { logPageView } from '../utils/logging.js'
const { Controller } = hmpoFormWizard

class PageController extends Controller {
  checkToolDeepLinkSessionKey = 'check-tool-deep-link'

  get (req, res, next) {
    logPageView(this.options.route, req.sessionID, req.ip)
    super.get(req, res, next)
  }

  locals (req, res, next) {
    if (this.options.backLink) {
      req.form.options.lastPage = this.options.backLink
    }
    if (req.sessionModel) {
      req.form.options.deepLink = req.sessionModel.get(this.checkToolDeepLinkSessionKey)
    }
    super.locals(req, res, next)
  }
}

export default PageController
