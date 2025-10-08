import * as Sentry from '@sentry/node'
import UploadController from './uploadController.js'
import { postUrlRequest } from '../services/asyncRequestApi.js'
import { URL } from 'url'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import axios from 'axios'
import { allowedFileTypes } from '../utils/utils.js'
import config from '../../config/index.js'

const HTTP_STATUS_METHOD_NOT_ALLOWED = 405

class SubmitUrlController extends UploadController {
  async post (req, res, next) {
    const plugin = req.body.plugin ?? null
    const localValidationErrorType = await SubmitUrlController.localUrlValidation(req.body.url, plugin)

    if (localValidationErrorType) {
      const error = {
        key: 'url',
        type: localValidationErrorType
      }
      const errors = {
        url: new SubmitUrlController.Error(error.key, error, req, res)
      }
      logger.info({
        message: 'SubmitUrlController: local validation failed during url submission',
        endpoint: req.originalUrl,
        error: JSON.stringify(error),
        submittedUrl: `${req.body.url ?? '<no url provided>'}`,
        type: types.DataValidation
      })
      return next(errors)
    }

    try {
      const url = (req.body?.url ?? '').trim()
      const id = await postUrlRequest({ ...this.getBaseFormData(req), url })
      req.body.request_id = id
    } catch (error) {
      next(error)
      return
    }
    super.post(req, res, next)
  }

  /**
   *
   * @param {string?} url
   * @returns { Promise<string | undefined> }
   */
  static async localUrlValidation (url, plugin) {
    const validators = [
      { type: 'required', fn: () => SubmitUrlController.urlIsDefined(url) },
      { type: 'format', fn: () => SubmitUrlController.urlIsValid(url) },
      { type: 'length', fn: () => SubmitUrlController.urlIsNotTooLong(url) }
    ]
    const preCheckFailure = validators.find(validator => !validator.fn())
    if (preCheckFailure) {
      return preCheckFailure.type
    }

    const postValidators = (resp) => ([
      { type: 'exists', fn: () => SubmitUrlController.isUrlAccessible(resp) },
      ...(plugin ? [] : [{ type: 'filetype', fn: () => SubmitUrlController.validateAcceptedFileType(resp) }]),
      { type: 'size', fn: () => SubmitUrlController.urlResponseIsNotTooLarge(resp) }
    ])
    const headResponse = await SubmitUrlController.headRequest(url)

    if (!headResponse) {
      logger.warn('submitUrlController/localUrlValidation: failed to get the submitted urls head, skipping post validators', {
        type: types.DataFetch
      })
      return null
    }

    if (headResponse?.status === HTTP_STATUS_METHOD_NOT_ALLOWED) {
      // HEAD request not allowed, return null or a specific error message
      logger.warn('submitUrlController/localUrlValidation: failed to get the submitted urls head as it was not allowed (405) skipping post validators', {
        type: types.DataFetch
      })
      return null
    }

    return postValidators(headResponse).find(validator => !validator.fn())?.type
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

  /**
   * @param {string} url
   * @returns {boolean}
   */
  static urlIsNotTooLong (url) {
    return url.length <= 2048
  }

  /**
   * Performs a HEAD request and returns the response object or null (when the URL couldn't be accessed).
   *
   * @param {string} url
   * @returns {Promise<AxiosResponse?>}
   */
  static async headRequest (url) {
    try {
      return await axios.head(url, { headers: { 'User-Agent': config.checkService.userAgent } })
    } catch (err) {
      const response = err?.response
      const tags = { code: err.code, url }
      if (response) {
        tags.responseStatus = response.status
        Sentry.metrics.increment('SubmitUrlController.headRequest: error', 1, { tags })
        return response
      }
      Sentry.metrics.increment('SubmitUrlController.headRequest: error', 1, { tags })
      logger.info({ message: `SubmitUrlController.headRequest(): err.code=${err.code}`, type: types.App, url })
      return null
    }
  }

  /**
   * @param {AxiosResponse?} response
   * @returns {boolean}
   */
  static urlResponseIsNotTooLarge (response) {
    const contentLength = (response?.headers ?? {})['content-length']

    try {
      // if the content length header is not provided, return true
      if (!contentLength) {
        console.info('urlResponseIsNotTooLarge(): Content-Length header not provided', { type: types.App })
        return true
      }

      return contentLength <= config.validations.maxFileSize
    } catch (err) {
      console.warn('urlResponseIsNotTooLarge()', { type: types.App, errorMessage: err.message, errorStack: err.stack, contentLength })
      return true // for now we will allow this file as we can't be sure
    }
  }

  /**
   * @param {AxiosResponse?} response
   * @returns {boolean}
   */
  static isUrlAccessible (response) {
    if (!response) {
      return false
    }

    try {
      return response.status !== 404 // Allow everything except 404, we cannot be sure what the server will return for HEAD requests
    } catch (err) {
      logger.warn(err)
      return true
    }
  }

  /**
   *
   * @param {AxiosResponse?} response
   * @returns {boolean}
   */
  static validateAcceptedFileType (response) {
    if (!response) { return false }
    try {
      const contentType = response.headers['content-type'].split(';')[0]
      const acceptedTypes = Object.values(allowedFileTypes).flat()
      return acceptedTypes.includes(contentType)
    } catch (err) {
      logger.warn(err)
      return false
    }
  }
}

export default SubmitUrlController
