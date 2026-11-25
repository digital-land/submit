import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { PassThrough } from 'node:stream'
import { postFileRequest, postUrlRequest, getRequestData } from '../../../src/services/asyncRequestApi.js'
import ResultData from '../../../src/models/requestData.js'
import logger from '../../../src/utils/logger.js'

vi.mock('axios')
vi.mock('../../../config/index.js', () => ({
  default: {
    asyncRequestApi: {
      url: 'http://localhost:8080',
      requestsEndpoint: 'requests'
    }
  }
}))
vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    debug: vi.fn(),
    warn: vi.fn()
  }
}))
vi.mock('../../../src/models/requestData.js')

describe('asyncRequestApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('postFileRequest', () => {
    it.each(['stream', 'json'])('sanitises %s error data before reporting it', async kind => {
      let authorization
      const stream = new PassThrough()
      axios.post.mockImplementationOnce(async (url, data, settings) => {
        authorization = settings.headers.Authorization
        stream.req = { headers: { authorization } }
        const body = kind === 'stream' ? stream : { detail: [authorization], Authorization: authorization }
        throw Object.assign(new Error('Request failed'), { response: { status: 401, data: body } })
      })

      const error = await postFileRequest({}).catch(error => error)
      const expected = kind === 'stream' ? undefined : { detail: ['Bearer [REDACTED]'] }
      expect(error.cause.response.data).toEqual(expected)
      expect(error.response.data).toEqual(expected)
      const details = logger.warn.mock.lastCall[1].errorDetails
      expect(details.responseData).toEqual(expected)
      expect(JSON.stringify(details)).not.toContain(authorization)
    })

    it('should post file request and return response id', async () => {
      const formData = {
        uploadedFilename: 'file.csv',
        originalFilename: 'original.csv',
        dataset: 'test-dataset',
        collection: 'test-collection',
        geomType: 'point',
        organisationName: 'Test Org'
      }

      axios.post.mockResolvedValueOnce({ data: { id: 'request-123' } })

      const result = await postFileRequest(formData)

      expect(result).toBe('request-123')
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8080/requests',
        {
          params: {
            dataset: 'test-dataset',
            collection: 'test-collection',
            organisationName: 'Test Org',
            geom_type: 'point',
            uploaded_filename: 'file.csv',
            original_filename: 'original.csv',
            type: 'check_file'
          }
        },
        expect.objectContaining({ headers: { Authorization: expect.stringMatching(/^Bearer /) }, maxRedirects: 0 })
      )
    })

    it('should throw error with detailed error info on request failure', async () => {
      const formData = {
        uploadedFilename: 'file.csv',
        originalFilename: 'original.csv',
        dataset: 'test-dataset',
        collection: 'test-collection',
        geomType: 'point',
        organisationName: 'Test Org'
      }

      const mockError = new Error('Network error')
      mockError.code = 'ECONNREFUSED'
      mockError.response = {
        status: 500,
        data: { error: 'Internal server error' }
      }
      mockError.config = {
        url: 'http://localhost:8080/requests',
        method: 'POST'
      }

      axios.post.mockRejectedValueOnce(mockError)
      await expect(postFileRequest(formData)).rejects.toThrow('Post request failed with status 500')

      expect(logger.warn).toHaveBeenCalledWith(
        'postRequest()',
        expect.objectContaining({
          type: 'App',
          errorDetails: expect.objectContaining({
            requestData: {
              dataset: 'test-dataset',
              collection: 'test-collection',
              organisationName: 'Test Org',
              geom_type: 'point',
              uploaded_filename: 'file.csv',
              original_filename: 'original.csv',
              type: 'check_file'
            },
            responseStatus: 500,
            errorCode: 'ECONNREFUSED',
            errorMessage: 'Network error',
            responseData: { error: 'Internal server error' },
            url: undefined
          })
        })
      )
    })
  })

  describe('postUrlRequest', () => {
    it('should post URL request and return response id', async () => {
      const formData = {
        url: 'https://example.com/data.csv',
        dataset: 'test-dataset',
        collection: 'test-collection',
        geomType: 'polygon',
        organisationName: 'Test Org'
      }

      axios.post.mockResolvedValueOnce({ data: { id: 'request-456' } })

      const result = await postUrlRequest(formData)

      expect(result).toBe('request-456')
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8080/requests',
        {
          params: {
            dataset: 'test-dataset',
            collection: 'test-collection',
            geom_type: 'polygon',
            organisationName: 'Test Org',
            url: 'https://example.com/data.csv',
            type: 'check_url'
          }
        },
        expect.objectContaining({ headers: { Authorization: expect.stringMatching(/^Bearer /) }, maxRedirects: 0 })
      )
    })

    it('should throw error with detailed error info on URL request failure', async () => {
      const formData = {
        url: 'https://example.com/data.csv',
        dataset: 'test-dataset',
        collection: 'test-collection',
        geom_type: 'polygon',
        organisationName: 'Test Org'
      }

      const mockError = new Error('URL validation failed')
      mockError.code = 'ERR_INVALID_URL'
      mockError.response = {
        status: 422,
        data: { errors: ['Invalid URL format'] }
      }
      mockError.config = { url: 'http://localhost:8080/requests' }

      axios.post.mockRejectedValueOnce(mockError)

      await expect(postUrlRequest(formData)).rejects.toThrow('Post request failed with status')
    })
  })

  describe('getRequestData', () => {
    it('should fetch request data and return ResultData instance', async () => {
      const mockResponseData = { id: 'request-123', status: 'complete' }
      const mockResultData = { id: 'request-123', status: 'complete' }

      axios.get.mockResolvedValueOnce({ data: mockResponseData })
      ResultData.mockImplementationOnce(function () { return mockResultData })

      const result = await getRequestData('request-123')

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:8080/requests/request-123',
        expect.objectContaining({ timeout: 15000, headers: { Authorization: expect.stringMatching(/^Bearer /) } })
      )
      expect(ResultData).toHaveBeenCalledWith(mockResponseData)
      expect(result).toBe(mockResultData)
    })

    it('should throw 404 error when request data not found', async () => {
      const mockError = new Error('Not found')
      mockError.response = { status: 404 }

      axios.get.mockRejectedValueOnce(mockError)

      await expect(getRequestData('non-existent')).rejects.toThrow(mockError)
    })

    it('should throw error with details for non-404 errors', async () => {
      const mockError = new Error('Server error')
      mockError.response = { status: 500 }

      axios.get.mockRejectedValueOnce(mockError)

      await expect(getRequestData('request-123')).rejects.toThrow('HTTP error! status: 500')
    })
  })
})
