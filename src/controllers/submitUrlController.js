import UploadController from './uploadController.js'
import { postUrlRequest } from '../utils/asyncRequestApi.js'
import { URL } from 'url'
import logger from '../utils/logger.js'

class SubmitUrlController extends UploadController {
  async post (req, res, next) {
    this.resetValidationErrorMessage()

    const localValidationErrorType = SubmitUrlController.localUrlValidation(req.body.url)

    if (localValidationErrorType) {
      const error = {
        key: 'url',
        type: localValidationErrorType
      }
      const errors = {
        url: new SubmitUrlController.Error(error.key, error, req, res)
      }
      logger.error('local validation failed during url submission', error)
      return next(errors)
    }

    try {
      const id = await postUrlRequest({ ...this.getBaseFormData(req), url: req.body.url })
      req.body.request_id = id
    } catch (error) {
      next(error)
      return
    }
    super.post(req, res, next)
  }

  static localUrlValidation (url) {
    const validators = [
      { type: 'required', fn: SubmitUrlController.urlIsDefined },
      { type: 'format', fn: SubmitUrlController.urlIsValid },
      { type: 'length', fn: SubmitUrlController.urlIsNotTooLong }
    ]

    return validators.find(validator => !validator.fn(url))?.type
  }

  static urlIsDefined (url) {
    return url !== '' && url !== undefined
  }

  static urlIsValid (url) {
    try {
      // eslint-disable-next-line no-new
      new URL(url)
      return true
    } catch (err) {
      return false
    }
  }

  static urlIsNotTooLong (url) {
    return url.length <= 2048
  }
}

export default SubmitUrlController
