'use strict'
import PageController from './pageController.js'
import config from '../../config/index.js'

import { severityLevels } from '../utils/utils.js'
import logger from '../utils/logger.js'

class UploadController extends PageController {
  apiRoute = config.api.url + config.api.validationEndpoint

  async get (req, res, next) {
    req.form.options.validationError = this.validationErrorMessage
    super.get(req, res, next)
  }

  async post (req, res, next) {
    super.post(req, res, next)
  }

  resetValidationErrorMessage () {
    this.validationErrorMessage = undefined
  }

  validationError (type, message, errorObject, req) {
    logger.error({ type, message, errorObject })
    req.body.validationResult = { error: true, message, errorObject }
    this.validationErrorMessage = message
  }

  static resultIsValid (validationResult) {
    return validationResult ? !validationResult.error : false
  }

  hasErrors () {
    return this.errorCount > 0
  }

  handleValidationResult (jsonResult, req) {
    if (jsonResult) {
      if (jsonResult.error) {
        this.validationError('apiError', jsonResult.message, {}, req)
      } else {
        try {
          this.errorCount = jsonResult['issue-log'].filter(issue => issue.severity === severityLevels.error).length + jsonResult['column-field-log'].filter(log => log.missing).length
          req.body.validationResult = jsonResult
        } catch (error) {
          this.validationError('apiError', 'Error parsing api response error count', error, req)
        }
      }
    } else {
      this.validationError('apiError', 'Nothing returned from the api', null, req)
    }
  }

  handleApiError (error, req) {
    logger.error('Error uploading file', error)
    if (error.code === 'ECONNREFUSED') {
      this.validationError('apiError', 'Unable to reach the api', error, req)
    } else if (error.code === 'ECONNABORTED') {
      this.validationError('apiError', 'Gateway Timeout', error, req)
    } else {
      switch (error.response.status) {
        case 400:
          this.validationError('apiError', 'Bad request sent to the api', error, req)
          break
        case 404:
          this.validationError('apiError', 'Validation endpoint not found', error, req)
          break
        case 500:
          this.validationError('apiError', 'Internal Server Error', error, req)
          break
        case 504:
          this.validationError('apiError', 'Gateway Timeout', error, req)
          break
        default:
          this.validationError('apiError', 'Error uploading file', error, req)
      }
    }
  }

  constructBaseFormData ({ dataset, dataSubject, organisation, sessionId, ipAddress }) {
    const formData = new FormData()
    formData.append('dataset', dataset)
    formData.append('collection', dataSubject)
    formData.append('organisation', organisation)
    formData.append('sessionId', sessionId)
    formData.append('ipAddress', ipAddress)

    return formData
  }
}

export default UploadController
