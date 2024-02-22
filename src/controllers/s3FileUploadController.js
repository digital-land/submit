'use strict'

import UploadController from './uploadController.js'
import logger from '../utils/logger.js'
import axios from 'axios'
import config from '../../config/index.js'

class S3UploadFileController extends UploadController {
  url = config.requestApi.baseUrl + config.requestApi.requestsEndpoint

  async post (req, res, next) {
    logger.info(`Got S3 file upload with original filename ${req.body.original_filename} and uploaded filename ${req.body.uploaded_filename}`)
    const request = await this.createRequest({
      user_email: 'chris.cundill@tpximpact.com',
      uploaded_file: {
        original_filename: req.body.original_filename,
        uploaded_filename: req.body.uploaded_filename
      }
    })
    logger.info(`Created request id ${request.id}`)
    req.sessionModel.set('requestId', request.id)
    super.post(req, res, next)
  }

  async createRequest (request) {
    const response = await axios.post(this.url, request, { timeout: config.requestApi.requestTimeout })
    return response.data
  }
}

export default S3UploadFileController
