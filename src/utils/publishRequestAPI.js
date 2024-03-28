import config from '../../config/index.js'
import RequestData from '../models/requestData.js'

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
  const response = await fetch(config.publishRequestApi, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  return data.id // assuming the response contains the id
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
