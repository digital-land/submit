import { it, describe, expect, afterEach, vi } from 'vitest'
import { postFileRequest, postUrlRequest, getRequestData } from '../../src/utils/asyncRequestApi.js'
import axios from 'axios'
import RequestData from '../../src/models/requestData.js'
import config from '../../config/index.js'

vi.mock('axios')

describe('asyncRequestApi', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('postFileRequest', () => {
    it('should make a POST request with the correct data', async () => {
      const formData = {
        uploadedFilename: 'file.txt',
        originalFilename: 'file.txt',
        dataset: 'dataset',
        collection: 'collection',
        geomType: 'point'
      }

      const expectedFormData = {
        dataset: 'dataset',
        collection: 'collection',
        geom_type: 'point',
        uploaded_filename: 'file.txt',
        original_filename: 'file.txt',
        type: 'check_file'
      }

      const expectedResponse = { data: { id: '123' } }
      axios.post.mockResolvedValue(expectedResponse)

      const result = await postFileRequest(formData)

      expect(axios.post).toHaveBeenCalledWith(expect.any(String), { params: expectedFormData })
      expect(result).toBe('123')
    })

    it('should throw an error if the POST request fails', async () => {
      const formData = {
        uploadedFilename: 'file.txt',
        originalFilename: 'file.txt',
        dataset: 'dataset',
        collection: 'collection',
        geomType: 'point'
      }

      const expectedError = new Error('HTTP error! status: 500. Data: data.')
      axios.post.mockRejectedValue({ response: { status: 500, data: 'data' } })

      await expect(postFileRequest(formData)).rejects.toThrow(expectedError)
    })
  })

  describe('postUrlRequest', () => {
    it('should make a POST request with the correct data', async () => {
      const formData = {
        url: 'https://example.com',
        dataset: 'dataset',
        collection: 'collection',
        geomType: 'point'
      }

      const expectedFormData = {
        dataset: 'dataset',
        collection: 'collection',
        geom_type: 'point',
        url: 'https://example.com',
        type: 'check_url'
      }

      const expectedResponse = { data: { id: '123' } }
      axios.post.mockResolvedValue(expectedResponse)

      const result = await postUrlRequest(formData)

      expect(axios.post).toHaveBeenCalledWith(expect.any(String), { params: expectedFormData })
      expect(result).toBe('123')
    })

    it('should throw an error if the POST request fails', async () => {
      const formData = {
        url: 'https://example.com',
        dataset: 'dataset',
        collection: 'collection',
        geomType: 'point'
      }

      const expectedError = new Error('HTTP error! status: 500. Data: data.')
      axios.post.mockRejectedValue({ response: { status: 500, data: 'data' } })

      await expect(postUrlRequest(formData)).rejects.toThrow(expectedError)
    })
  })

  describe('getRequestData', () => {
    it('should make a GET request with the correct URL', async () => {
      const resultId = '123'
      const expectedUrl = `${config.asyncRequestApi.url}/requests/${resultId}`

      const expectedResponse = { status: 200, data: { id: '123' } }
      axios.get.mockResolvedValue(expectedResponse)

      const result = await getRequestData(resultId)

      expect(axios.get).toHaveBeenCalledWith(expectedUrl)
      expect(result).toBeInstanceOf(RequestData)
    })

    it('should throw an error if the GET request fails with status 404', async () => {
      const resultId = '123'

      const expectedError = new Error('HTTP error! status: 404')
      expectedError.message = 'HTTP error! status: 404'
      expectedError.status = 404

      const expectedResponse = { status: 404 }
      axios.get.mockRejectedValue(expectedResponse)

      await expect(getRequestData(resultId)).rejects.toThrow(expectedError)
    })

    it('should throw an error if the GET request fails with status 500', async () => {
      const resultId = '123'

      const expectedError = new Error('HTTP error! status: 500')
      expectedError.message = 'HTTP error! status: 500'
      expectedError.status = 500

      const expectedResponse = { status: 500 }
      axios.get.mockRejectedValue(expectedResponse)

      await expect(getRequestData(resultId)).rejects.toThrow(expectedError)
    })
  })
})
