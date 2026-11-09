import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { postFileRequest, postUrlRequest, getRequestData, postAddDataSubmission, checkAddDataSubmissionDuplicate } from '../../../src/services/asyncRequestApi.js'
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
    axios.post.mockReset()
  })

  describe('checkAddDataSubmissionDuplicate', () => {
    it.each([true, false])('returns the duplicate boolean: %s', async (duplicate) => {
      axios.post.mockResolvedValueOnce({ data: { duplicate } })
      const body = { endpoint_url: 'https://example.org/trees.csv', organisation: 'local-authority:ABC', dataset: 'tree' }
      expect(await checkAddDataSubmissionDuplicate(body)).toBe(duplicate)
      expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/add-data-submissions/duplicate-check', body, { timeout: 15000 })
    })

    it.each([undefined, {}, { duplicate: 'false' }, { duplicate: null }])('fails closed for malformed responses: %j', async (data) => {
      axios.post.mockResolvedValueOnce({ data })
      await expect(checkAddDataSubmissionDuplicate({ endpoint_url: 'https://example.org/trees.csv', organisation: 'local-authority:ABC', dataset: 'tree' })).rejects.toThrow()
    })
  })

  describe('postAddDataSubmission', () => {
    const body = {
      check_request_id: 'check-123',
      dataset: 'tree',
      documentation_url: 'https://example.org/docs',
      source: 'check_tool',
      jira_issue_key: 'DATA-215',
      contact_name: null,
      contact_email: null
    }

    it('posts the submission envelope and returns its ID, not its async reference', async () => {
      axios.post.mockResolvedValueOnce({ data: { id: 'submission-123', reference: 'PDP-ABC123' } })
      expect(await postAddDataSubmission(body)).toBe('submission-123')
      expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/add-data-submissions', body, { timeout: 15000 })
    })

    it.each([undefined, {}, { reference: 'PDP-ABC123' }, { id: '' }])('rejects an invalid receipt: %j', async (data) => {
      axios.post.mockResolvedValueOnce({ data })
      await expect(postAddDataSubmission(body)).rejects.toThrow()
    })

    it('propagates failures so the controller can retry without repeating Jira', async () => {
      axios.post.mockRejectedValueOnce(new Error('Async unavailable'))
      await expect(postAddDataSubmission(body)).rejects.toThrow('Async unavailable')
    })
  })

  describe('postFileRequest', () => {
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
        }
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
            url: 'http://localhost:8080/requests'
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
        }
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
        expect.any(URL),
        { timeout: 15000 }
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
