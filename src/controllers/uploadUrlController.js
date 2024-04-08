import UploadController from './uploadController.js'
import { postUrlRequest } from '../utils/asyncRequestApi.js'
import { URL } from 'url'

class UploadUrlController extends UploadController {
  async post (req, res, next) {
    this.resetValidationErrorMessage()
    if (!UploadUrlController.localUrlValidation(req.body.url)) {
      this.validationError('format', '', null, req)
    } else {
      try {
        const id = await postUrlRequest({ ...this.getBaseFormData(req), url: req.body.url })
        req.body.request_id = id
      } catch (error) {
        this.handleApiError(error, req)
      }
    }
    super.post(req, res, next)
  }

  static localUrlValidation (url) {
    return UploadUrlController.urlIsValid(url) && UploadUrlController.urlIsNotTooLong(url)
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

export default UploadUrlController
