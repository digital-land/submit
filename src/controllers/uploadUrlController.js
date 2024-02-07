import UploadController from './uploadController.js'
import URL from 'url'
import axios from 'axios'
import config from '../../config/index.js'

class UploadUrlController extends UploadController {
  async post (req, res, next) {
    this.resetValidationErrorMessage()
    try {
      const apiValidationResult = await this.apiValidateUrl(req.body.url, {
        dataset: req.sessionModel.get('dataset'),
        dataSubject: req.sessionModel.get('data-subject'),
        sessionId: req.session.id,
        ipAddress: req.ip
      })
      this.handleValidationResult(apiValidationResult, req)
    } catch (error) {
      this.handleApiError(error, req)
    }
    super.post(req, res, next)
  }

  async apiValidateUrl (url, { dataset, dataSubject, organisation, sessionId, ipAddress }) {
    const formData = this.constructBaseFormData({ dataset, dataSubject, organisation, sessionId, ipAddress })
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
