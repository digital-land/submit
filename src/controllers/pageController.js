import hmpoFormWizard from 'hmpo-form-wizard'
import { logPageView } from '../utils/logging.js'
const { Controller } = hmpoFormWizard

class PageController extends Controller {
  locals (req, res, callback) {
    req.form.options.lastPage = this.options.backLink ? this.options.backLink : undefined
    super.locals(req, res, callback)
  }

  get (req, res, next) {
    logPageView(this.options.route, req.sessionID, req.ip)
    super.get(req, res, next)
  }
}

export default PageController
