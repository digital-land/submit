import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

class CheckConfirmationController extends PageController {
  async locals (req, res, next) {
    const requestId = req.sessionModel.get('request_id')
    if (requestId) {
      try {
        const requestData = await getRequestData(requestId)
        if (requestData?.getParams()?.type === 'check_url') {
          req.form.options.requestId = requestId
          req.session.checkRequestId = requestId
        }
      } catch (error) {
        logger.warn('CheckConfirmationController.locals(): failed to fetch request data', {
          requestId,
          errorMessage: error.message,
          type: types.External
        })
      }
    }
    super.locals(req, res, next)
  }
}

export default CheckConfirmationController
