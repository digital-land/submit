'use strict'
import PageController from './pageController.js'
import config from '../../config/index.js'
import logger from '../utils/logger.js'

class UploadController extends PageController {
  apiRoute = config.publishRequestApi.url + config.publishRequestApi.requestsEndpoint

  locals (req, res, next) {
    req.form.options.validationError = this.validationErrorMessage
    super.locals(req, res, next)
  }

  async post (req, res, next) {
    super.post(req, res, next)
  }

  resetValidationErrorMessage () {
    this.validationErrorMessage = undefined
  }

  validationError (type, message, errorObject, req) {
    logger.error({ type, message, errorObject })
    this.validationErrorMessage = message
  }

  getBaseFormData (req) {
    return {
      dataset: req.sessionModel.get('dataset'),
      collection: req.sessionModel.get('data-subject'),
      geomType: req.sessionModel.get('geomType'),
      sessionId: req.session.id
    }
  }
}

export default UploadController
