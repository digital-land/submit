import hmpoFormWizard from 'hmpo-form-wizard'
import logger from '../utils/logger.js'
const { Controller } = hmpoFormWizard

class MyPageController extends Controller {
  locals (req, res, callback) {
    req.form.options.lastPage = req.journeyModel.get('lastVisited')
    super.locals(req, res, callback)
  }

  get (req, res, next) {
    logger.info({
      type: 'PageView',
      pageRoute: this.options.route,
      message: `page view occurred for page: ${req.originalUrl}`,
      sessionId: req.sessionID,
      ipAddress: req.ip
    })
    super.get(req, res, next)
  }
}

export default MyPageController
