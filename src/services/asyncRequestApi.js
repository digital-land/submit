import axios from 'axios'
import config from '../../config/index.js'
import ResultData from '../models/requestData.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

const requestsEndpoint = `${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}`

export const postFileRequest = async (formData) => {
  const { uploadedFilename, originalFilename, dataset, collection, geomType } = formData

  return await postRequest({
    dataset,
    collection,
    geom_type: geomType,
    uploaded_filename: uploadedFilename,
    original_filename: originalFilename,
    type: 'check_file'
  })
}

export const postUrlRequest = async (formData) => {
  const { url, dataset, collection, geomType } = formData
  logger.debug('postUrlRequest', { url, dataset, collection, geomType })
  return await postRequest({
    dataset,
    collection,
    geom_type: geomType,
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
    const errorMessage = 'post request failed:' +
      (error.response
        ? `response status: ${error.response.status}, response data: '${error.response.data}', `
        : 'No response received, ') +
      `cause: '${error?.cause}' ` +
      `code: ${error.code}, ` +
      `message: '${error.message ?? 'no message provided'}', ` +
      (error.config ? `Error in Axios configuration ${error.config}` : '')
    logger.warn('postRequest()', { type: types.App, formData })
    throw new Error(errorMessage)
  }
}

export const getRequestData = async (resultId, opts = undefined) => {
  const url = new URL(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${resultId}`)
  try {
    const response = await axios.get(url)
    return new ResultData(response.data)
  } catch (error) {
    if (error?.response?.status === 404) {
      throw error
    }
    throw new Error(`HTTP error! status: ${error.status}: ${error.message}`, { cause: error })
  }
}
