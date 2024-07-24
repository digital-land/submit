import axios from 'axios'
import config from '../../config/index.js'
import RequestData from '../models/requestData.js'

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
 * @throws
 */
const postRequest = async (formData) => {
  try {
    const response = await axios.post(requestsEndpoint, { params: formData })
    return response.data.id // assuming the response contains the id
  } catch (error) {
    // see: https://axios-http.com/docs/handling_errors
    const errorMessage = `post request failed: response.status = '${error.response?.status}', ` +
      `data: '${error.response.data}', ` +
      `cause: '${error.cause}'` +
      (error.request ? 'No response received, ' : '') +
      `message: '${error.message}', ` +
      (error.config ? `Error in Axios configuration ${error.config}` : '')

    throw new Error(errorMessage)
  }
}

export const getRequestData = async (resultId) => {
  try {
    const response = await axios.get(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${resultId}`)

    return new RequestData(response.data)
  } catch (error) {
    throw new Error(`HTTP error! status: ${error.status}`)
  }
}
