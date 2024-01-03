import hmpoFormWizard from 'hmpo-form-wizard'
import logger from '../utils/logger.js'
import hash from '../utils/hasher.js'
const { Controller } = hmpoFormWizard

class PageController extends Controller {
  locals (req, res, callback) {
    req.form.options.lastPage = this.options.backLink ? this.options.backLink : undefined
    super.locals(req, res, callback)
  }

  async get (req, res, next) {
    logger.info({
      type: 'PageView',
      pageRoute: this.options.route,
      message: `page view occurred for page: ${req.originalUrl}`,
      sessionId: await hash(req.sessionID),
      ipAddress: await hash(req.ip)
    })
    super.get(req, res, next)
  }
}

export default PageController
