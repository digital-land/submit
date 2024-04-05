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

    console.log('Response:', response)
    return response.data.id // assuming the response contains the id
  } catch (error) {
    throw new Error(`HTTP error! status: ${error.response.status}`)
  }
}

export const getRequestData = async (resultId) => {
  try {
    const response = await axios.get(`${config.publishRequestApi.url}/${config.publishRequestApi.requestsEndpoint}/${resultId}`)

    return new RequestData(response.data)
  } catch (error) {
    throw new Error(`HTTP error! status: ${error.status}`)
  }
}
