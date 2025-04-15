import RequestData, { fetchPaginated } from '../../src/models/requestData.js'
import ResponseDetails from '../../src/models/responseDetails.js'
import { describe, it, expect, vi } from 'vitest'
import axios from 'axios'
import logger from '../../src/utils/logger.js'

vi.mock('axios')

vi.mock('../utils/logger.js', () => {
  return {
    default: {
      error: vi.fn()
    }
  }
})

vi.spyOn(logger, 'error')

// Tech Debt: we should write some more tests around the requestData.js file
describe('RequestData', () => {
  describe('fetchResponseDetails', () => {
    it('should return a new ResponseDetails object (paginated)', async () => {
      axios.get.mockResolvedValueOnce({
        headers: {
          'x-pagination-total-results': '2',
          'x-pagination-offset': '0',
          'x-pagination-limit': '1'
        },
        data: [{ 'error-summary': ['error1', 'error2'] }]
      })
        .mockResolvedValueOnce({
          headers: {
            'x-pagination-total-results': '2',
            'x-pagination-offset': '1',
            'x-pagination-limit': '1'
          },
          data: [{ 'error-summary': ['error1', 'error2'] }]
        })

      const response = {
        id: 1,
        getColumnFieldLog: () => []
      }
      const requestData = new RequestData(response)

      const responseDetails = await requestData.fetchResponseDetails(0, 1)

      expect(responseDetails).toBeInstanceOf(ResponseDetails)

      expect(responseDetails.pagination.totalResults).toBe('2')
      expect(responseDetails.pagination.offset).toBe('0')
      expect(responseDetails.pagination.limit).toBe('2')
      expect(responseDetails.response).toStrictEqual([
        { 'error-summary': ['error1', 'error2'] },
        { 'error-summary': ['error1', 'error2'] }
      ])
    })

    it('should return a new ResponseDetails object', async () => {
      axios.get.mockResolvedValue({
        headers: {
          'x-pagination-total-results': 1,
          'x-pagination-offset': 0,
          'x-pagination-limit': 50
        },
        data: [{ 'error-summary': ['error1', 'error2'] }]
      })

      const response = {
        id: 1,
        getColumnFieldLog: () => []
      }
      const requestData = new RequestData(response)

      const responseDetails = await requestData.fetchResponseDetails()

      expect(responseDetails).toBeInstanceOf(ResponseDetails)

      expect(responseDetails.pagination.totalResults).toBe('1')
      expect(responseDetails.pagination.offset).toBe('0')
      expect(responseDetails.pagination.limit).toBe(responseDetails.pagination.totalResults)
      expect(responseDetails.response).toStrictEqual([{ 'error-summary': ['error1', 'error2'] }])

      const url = new URL('http://localhost:8001/requests/1/response-details?offset=0&limit=50')
      expect(axios.get).toHaveBeenCalledWith(url, { timeout: 30000 })
    })

    it('correctly sets the jsonpath if severity is provided', async () => {
      axios.get.mockResolvedValue({
        headers: {
          'x-pagination-total-results': 1,
          'x-pagination-offset': 0,
          'x-pagination-limit': 50
        },
        data: [{ 'error-summary': ['error1', 'error2'] }]
      })

      const response = {
        id: 1,
        getColumnFieldLog: () => []
      }
      const requestData = new RequestData(response)

      await requestData.fetchResponseDetails(0, 50, { severity: 'error' })
      const url = new URL(`http://localhost:8001/requests/1/response-details?offset=0&limit=50&jsonpath=${encodeURIComponent('$.issue_logs[*].severity=="error"')}`)

      expect(axios.get).toHaveBeenCalledWith(url, { timeout: 30000 })
    })
  })

  describe('isFailed', () => {
    it('should return true if the status is FAILED', () => {
      const response = {
        status: 'FAILED'
      }
      const requestData = new RequestData(response)

      const isFailed = requestData.isFailed()

      expect(isFailed).toBe(true)
    })

    it('should return false if the status is not FAILED', () => {
      const response = {
        status: 'SUCCESS'
      }
      const requestData = new RequestData(response)

      const isFailed = requestData.isFailed()

      expect(isFailed).toBe(false)
    })
  })

  describe('getType', () => {
    it('should return the type', () => {
      const response = {
        type: 'type1'
      }
      const requestData = new RequestData(response)

      const type = requestData.getType()

      expect(type).toBe('type1')
    })
  })

  describe('getError', () => {
    it('should return the error from the response', () => {
      const response = {
        error: { message: 'error message' }
      }
      const requestData = new RequestData({ response })

      const error = requestData.getError()

      expect(error).toStrictEqual({ message: 'error message' })
    })

    it('should return an unknown error if there is no error', () => {
      const requestData = new RequestData({})

      const error = requestData.getError()

      expect(error).toStrictEqual({ message: 'An unknown error occurred.' })
    })
  })

  describe('hasErrors', () => {
    it('should return true if there are errors', () => {
      const response = {
        data: {
          'error-summary': ['error1', 'error2']
        }
      }
      const requestData = new RequestData({ response })

      const hasErrors = requestData.hasErrors()

      expect(hasErrors).toBe(true)
    })

    it('should return true if there are no errors', () => {
      const requestData = new RequestData({})

      const hasErrors = requestData.hasErrors()

      expect(hasErrors).toBe(true)
    })

    it('should return true if there is no error summary', () => {
      const response = {
        data: {}
      }
      const requestData = new RequestData({ response })

      const hasErrors = requestData.hasErrors()

      expect(hasErrors).toBe(true)
    })

    it('should return false if the error summary is empty', () => {
      const response = {
        data: {
          'error-summary': []
        }
      }
      const requestData = new RequestData({ response })

      const hasErrors = requestData.hasErrors()

      expect(hasErrors).toBe(false)
    })
  })

  describe('isComplete', () => {
    it('should return true if the status is COMPLETE', () => {
      const response = {
        status: 'COMPLETE'
      }
      const requestData = new RequestData(response)

      const isComplete = requestData.isComplete()

      expect(isComplete).toBe(true)
    })

    it('should return true if the status is FAILED', () => {
      const response = {
        status: 'FAILED'
      }
      const requestData = new RequestData(response)

      const isComplete = requestData.isComplete()

      expect(isComplete).toBe(true)
    })

    it('should return false if the status is not COMPLETE or FAILED', () => {
      const response = {
        status: 'IN_PROGRESS'
      }
      const requestData = new RequestData(response)

      const isComplete = requestData.isComplete()

      expect(isComplete).toBe(false)
    })
  })

  describe('getColumnFieldLog', () => {
    it('should return the column field log from the response', () => {
      const response = {
        data: {
          'column-field-log': ['column1', 'column2']
        }
      }
      const requestData = new RequestData({ response })

      const columnFieldLog = requestData.getColumnFieldLog()

      expect(columnFieldLog).toStrictEqual(['column1', 'column2'])
    })

    it('should return an empty array if there is no column field log', () => {
      const requestData = new RequestData({})

      const columnFieldLog = requestData.getColumnFieldLog()

      expect(columnFieldLog).toStrictEqual([])
    })
  })

  describe('getParams', () => {
    it('should return the params', () => {
      const requestData = new RequestData({ params: { param1: 'value1' } })

      const params = requestData.getParams()

      expect(params).toStrictEqual({ param1: 'value1' })
    })
  })

  describe('getId', () => {
    it('should return the id', () => {
      const requestData = new RequestData({ id: 1 })

      const id = requestData.getId()

      expect(id).toBe(1)
    })
  })
})

describe('fetchPaginated', async () => {
  it('makes paginated fetch', async ({ expect }) => {
    const url = new URL('http://example.com/response-details')
    const result = await fetchPaginated(url, { limit: 2, offset: 0, maxOffset: 7 })
    expect(result.length).toBe(4)
  })
})
