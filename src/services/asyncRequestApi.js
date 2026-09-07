import axios from 'axios'
import config from '../../config/index.js'
import ResultData from '../models/requestData.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

const requestsEndpoint = `${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}`

/**
 * Creates a `check_file` request for a file already uploaded to S3.
 *
 * @param {object} formData
 * @param {string} formData.uploadedFilename - name the file was stored under
 * @param {string} formData.originalFilename - name the user's file had
 * @param {string} formData.dataset
 * @param {string} formData.collection
 * @param {string} [formData.geomType] - only set for datasets that require it (e.g. tree)
 * @param {string} formData.organisationName - organisation code, not the display name
 * @returns {Promise<string>} id of the created request, stored in the wizard as `request_id`
 */
export const postFileRequest = async (formData) => {
  const { uploadedFilename, originalFilename, dataset, collection, geomType, organisationName } = formData

  return await postRequest({
    dataset,
    collection,
    organisationName,
    geom_type: geomType,
    uploaded_filename: uploadedFilename,
    original_filename: originalFilename,
    type: 'check_file'
  })
}

/**
 * Creates a `check_url` request for a user supplied endpoint URL.
 *
 * Only requests of this type can go on to be provided — the submit wizard checks
 * `type === 'check_url'` before it will accept a request.
 *
 * @param {object} formData
 * @param {string} formData.url - the endpoint URL to check
 * @param {string} formData.dataset
 * @param {string} formData.collection
 * @param {string} [formData.geomType] - only set for datasets that require it (e.g. tree)
 * @param {string} formData.organisationName - organisation code, not the display name
 * @returns {Promise<string>} id of the created request, stored in the wizard as `request_id`
 */
export const postUrlRequest = async (formData) => {
  const { url, dataset, collection, geomType, organisationName } = formData
  logger.debug('postUrlRequest', { url, dataset, collection, geomType, organisationName })
  return await postRequest({
    dataset,
    collection,
    geom_type: geomType,
    organisationName,
    url,
    type: 'check_url'
  })
}

/**
 * Creates a request from an already-built params object, without the field mapping
 * `postUrlRequest` and `postFileRequest` do. Used when resubmitting a check with user
 * supplied column mappings, where the params are copied from the original request.
 *
 * @param {object} params - passed to the API as-is; the caller owns the shape
 * @returns {Promise<string>} id of the created request
 */
export const postCheckRequest = async (params) => {
  return await postRequest(params)
}

/**
 * POSTs a requeset to the 'publish' API.
 *
 * @param {*} formData
 * @returns {Promise<string>} uuid - unique id of the uploaded file
 */
const postRequest = async (formData) => {
  try {
    const response = await axios.post(requestsEndpoint, { params: formData })
    return response.data.id // assuming the response contains the id
  } catch (error) {
    // see: https://axios-http.com/docs/handling_errors
    const errorDetails = {
      requestData: formData,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
      errorCode: error.code,
      errorMessage: error.message,
      errorCause: error?.cause,
      url: error?.config?.url
    }
    const errorMessage = `Post request failed with status ${errorDetails.responseStatus} and message: ${errorDetails.errorMessage}`
    logger.warn('postRequest()', { type: types.App, errorDetails })
    const newError = new Error(errorMessage, { cause: error })
    newError.code = error.code
    newError.response = error.response
    throw newError
  }
}

/**
 * Fetches a request and wraps it in a {@link ResultData} model.
 *
 * Note the error handling: a **404 is rethrown unchanged** so callers can tell "no such
 * request" apart from a genuine failure and redirect instead of erroring (the submit
 * wizard's guards rely on this). Every other failure is wrapped in a generic `Error`
 * with the original attached as `cause`.
 *
 * Uses a hardcoded 15s timeout — `config.asyncRequestApi.requestTimeout` is declared in
 * config but not read here.
 *
 * @param {string} resultId - id returned by one of the `post*Request` functions
 * @param {*} [opts] - currently unused
 * @returns {Promise<ResultData>}
 * @throws the original axios error when the request does not exist (404), otherwise a
 *   wrapped `Error`
 */
export const getRequestData = async (resultId, opts = undefined) => {
  const url = new URL(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${resultId}`)
  try {
    const response = await axios.get(url, { timeout: 15000 })
    return new ResultData(response.data)
  } catch (error) {
    if (error?.response?.status === 404) {
      throw error
    }
    const status = error.response?.status ?? error.code ?? 'Unknown'
    throw new Error(`HTTP error! status: ${status}: ${error.message}`, { cause: error })
  }
}
