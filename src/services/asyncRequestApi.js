import axios from 'axios'
import config from '../../config/index.js'
import ResultData from '../models/requestData.js'
import logger from '../utils/logger.js'

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
    const errorMessage = `post request failed: response.status = '${error.response?.status}', ` +
      `data: '${error.response?.data}', ` +
      `cause: '${error?.cause}' ` +
      (error.request ? 'No response received, ' : '') +
      `message: '${error.message ?? 'no meesage provided'}', ` +
      (error.config ? `Error in Axios configuration ${error?.config}` : '')

    throw new Error(errorMessage)
  }
}

export const getRequestData = async (resultId) => {
  try {
    const response = await axios.get(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${resultId}`)

    return new ResultData(response.data)
  } catch (error) {
    throw new Error(`HTTP error! status: ${error.status}`)
  }
}
