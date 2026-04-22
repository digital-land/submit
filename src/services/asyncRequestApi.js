import axios from 'axios'
import config from '../../config/index.js'
import ResultData from '../models/requestData.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

const requestsEndpoint = `${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}`

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
      url: error?.config.url
    }
    const errorMessage = `Post request failed with status ${errorDetails.responseStatus} and message: ${errorDetails.errorMessage}`
    logger.warn('postRequest()', { type: types.App, errorDetails })
    const newError = new Error(errorMessage, { cause: error })
    newError.code = error.code
    newError.response = error.response
    throw newError
  }
}

export const getRequestData = async (resultId, opts = undefined) => {
  const url = new URL(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${resultId}`)
  try {
    const response = await axios.get(url, { timeout: 15000 })
    return new ResultData(response.data)
  } catch (error) {
    if (error?.response?.status === 404) {
      throw error
    }
    throw new Error(`HTTP error! status: ${error.response?.status}: ${error.message}`, { cause: error })
  }
}
