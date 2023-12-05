import hmpoFormWizard from 'hmpo-form-wizard'
import logger from '../utils/logger.js'
const { Controller } = hmpoFormWizard

class MyController extends Controller {
  locals (req, res, callback) {
    req.form.options.lastPage = req.journeyModel.get('lastVisited')
    super.locals(req, res, callback)
  }

  get (req, res) {
    logger.info({
      type: 'PageView',
      endpoint: req.originalUrl,
      message: `page view occurred for page: ${req.originalUrl}`,
      sessionId: req.sessionID,
      ipAddress: req.ip
    })
    super.get(req, res)
  }
}

export default MyController
