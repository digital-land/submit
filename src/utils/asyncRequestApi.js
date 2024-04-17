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

const postRequest = async (formData) => {
  try {
    const response = await axios.post(requestsEndpoint, { params: formData })
    return response.data.id // assuming the response contains the id
  } catch (error) {
    let errorMessage = 'An unknown error occurred.'

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `HTTP error! status: ${error.response.status}. Data: ${error.response.data}.`
    } else if (error.cause) {
      // If error has a cause property, it means the error was during axios request
      errorMessage = `Error during request: (${error.cause.code}) ${error.cause.message}`
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received.'
    } else if (error.message) {
      // Something happened in setting up the request that triggered an Error
      errorMessage = `Error in setting up the request: ${error.message}`
    } else if (error.config) {
      // If error has a config property, it means the error was during axios configuration
      errorMessage = `Error in Axios configuration: ${error.config}`
    }

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
