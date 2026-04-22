import { it, describe, expect, afterEach, vi } from 'vitest'
import { postFileRequest, postUrlRequest, getRequestData } from '../../src/services/asyncRequestApi.js'
import axios from 'axios'
import RequestData from '../../src/models/requestData.js'
import config from '../../config/index.js'
import logger from '../../src/utils/logger.js'

vi.mock('axios')
vi.mock('../../src/utils/logger.js', () => ({
  default: {
    debug: vi.fn(),
    warn: vi.fn()
  }
}))

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

      const mockError = new Error('Network error')
      mockError.code = 'ECONNREFUSED'
      mockError.config = { url: 'http://localhost:8080/requests' }
      mockError.response = { status: 500, data: { message: 'data' } }

      axios.post.mockRejectedValueOnce(mockError)

      await expect(postFileRequest(formData)).rejects.toMatchObject({
        message: 'Post request failed with status 500 and message: Network error',
        cause: mockError,
        code: 'ECONNREFUSED',
        response: mockError.response
      })

      expect(logger.warn).toHaveBeenCalledWith(
        'postRequest()',
        expect.objectContaining({
          type: 'App',
          errorDetails: expect.objectContaining({
            requestData: {
              dataset: 'dataset',
              collection: 'collection',
              organisationName: undefined,
              geom_type: 'point',
              uploaded_filename: 'file.txt',
              original_filename: 'file.txt',
              type: 'check_file'
            },
            responseStatus: 500,
            responseData: { message: 'data' },
            errorCode: 'ECONNREFUSED',
            errorMessage: 'Network error',
            errorCause: undefined,
            url: 'http://localhost:8080/requests'
          })
        })
      )
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

      const mockError = new Error('Request failed')
      mockError.code = 'ERR_BAD_REQUEST'
      mockError.config = { url: 'http://localhost:8080/requests' }
      mockError.response = { status: 500, data: { message: 'data' } }

      axios.post.mockRejectedValueOnce(mockError)

      await expect(postUrlRequest(formData)).rejects.toMatchObject({
        message: 'Post request failed with status 500 and message: Request failed',
        cause: mockError,
        code: 'ERR_BAD_REQUEST',
        response: mockError.response
      })

      expect(logger.warn).toHaveBeenCalledWith(
        'postRequest()',
        expect.objectContaining({
          type: 'App',
          errorDetails: expect.objectContaining({
            requestData: {
              dataset: 'dataset',
              collection: 'collection',
              geom_type: 'point',
              organisationName: undefined,
              url: 'https://example.com',
              type: 'check_url'
            },
            responseStatus: 500,
            responseData: { message: 'data' },
            errorCode: 'ERR_BAD_REQUEST',
            errorMessage: 'Request failed',
            errorCause: undefined,
            url: 'http://localhost:8080/requests'
          })
        })
      )
    })
  })

  describe('getRequestData', () => {
    it('should make a GET request with the correct URL', async () => {
      const resultId = '123'
      const expectedUrl = `${config.asyncRequestApi.url}/requests/${resultId}`

      const expectedResponse = { status: 200, data: { id: '123' } }
      axios.get.mockResolvedValue(expectedResponse)

      const result = await getRequestData(resultId)

      expect(axios.get).toHaveBeenCalledWith(new URL(expectedUrl), { timeout: 15000 })
      expect(result).toBeInstanceOf(RequestData)
    })

    it('should throw an error if the GET request fails with status 404', async () => {
      const resultId = '123'

      const mockError = new Error('Failed to do the thing')
      mockError.response = { status: 404, message: 'Failed to do the thing' }
      axios.get.mockRejectedValueOnce(mockError)

      await expect(getRequestData(resultId)).rejects.toBe(mockError)
    })

    it('should throw an error if the GET request fails with status 500', async () => {
      const resultId = '123'

      const mockError = new Error('Failed to do the thing')
      mockError.response = { status: 500, message: 'Failed to do the thing' }
      axios.get.mockRejectedValueOnce(mockError)

      await expect(getRequestData(resultId)).rejects.toThrow('HTTP error! status: 500')
    })
  })
})
