import axios from 'axios'
import config from '../../config/index.js'
import RequestData from '../models/requestData.js'

const requestsEndpoint = `${config.publishRequestApi.url}/${config.publishRequestApi.requestsEndpoint}`

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
    throw new Error(`HTTP error! status: ${error.response.status}`)
  }
}

export const getRequestData = async (resultId) => {
  const result = await fetch(`${config.publishRequestApi.url}/${config.publishRequestApi.requestsEndpoint}/${resultId}`)

  if (!result.ok) {
    if (result.status === 404) {
      throwCustomError('Request not found', { message: 'Request not found', status: result.status })
    } else {
      throwCustomError('Unexpected error', { message: 'Unexpected error', status: result.status })
    }
  }

  const resultJson = await result.json()
  return new RequestData(resultJson)
}

const throwCustomError = (message, params) => {
  const error = new Error(message)
  Object.assign(error, params)
  throw error
}
