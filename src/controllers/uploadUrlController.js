import UploadController from './uploadController.js'
import { URL } from 'url'
import axios from 'axios'
import config from '../../config/index.js'

class UploadUrlController extends UploadController {
  async post (req, res, next) {
    this.resetValidationErrorMessage()
    if (!UploadUrlController.localUrlValidation(req.body.url)) {
      this.validationError('format', '', null, req)
    } else {
      try {
        const id = await this.publishRequestApi.postRequest({ ...this.getBaseFormData(req), url: req.body.url })

        req.body.request_id = id
        super.post(req, res, next)
      } catch (error) {
        this.handleApiError(error, req)
      }
    }
    super.post(req, res, next)
  }

  async apiValidateUrl (url, { dataset, dataSubject, geomType, organisation, sessionId }) {
    const formData = this.constructBaseFormData({ dataset, dataSubject, geomType, organisation, sessionId })
    formData.append('upload_url', url)

    const result = await axios.post(this.apiRoute, formData, { timeout: config.api.requestTimeout })

    return result.data
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
