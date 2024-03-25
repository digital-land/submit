import config from '../../config/index.js'

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
  const resultJson = await result.json()
  return new RequestData(resultJson)
}

export class RequestData {
  constructor (data) {
    Object.assign(this, data)
  }

  hasErrors () {
    return this.data['error-summary'].length > 0
  }

  isComplete () {
    return this.status === 'COMPLETE'
  }
}
