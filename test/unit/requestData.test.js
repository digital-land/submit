import RequestData from '../../src/models/requestData'
import ResponseDetails from '../../src/models/responseDetails'
import { describe, it, expect, vi } from 'vitest'
import axios from 'axios'
import logger from '../../src/utils/logger'

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
    it('should return a new ResponseDetails object', async () => {
      axios.get.mockResolvedValue({
        headers: {
          'x-pagination-total-results': 1,
          'x-pagination-offset': 0,
          'x-pagination-limit': 50
        },
        data: {
          'error-summary': ['error1', 'error2']
        }
      })

      const response = {
        id: 1,
        getColumnFieldLog: () => []
      }
      const requestData = new RequestData(response)

      const responseDetails = await requestData.fetchResponseDetails()

      expect(responseDetails).toBeInstanceOf(ResponseDetails)

      expect(responseDetails.pagination.totalResults).toBe(1)
      expect(responseDetails.pagination.offset).toBe(0)
      expect(responseDetails.pagination.limit).toBe(50)
      expect(responseDetails.response).toStrictEqual({
        'error-summary': ['error1', 'error2']
      })

      expect(axios.get).toHaveBeenCalledWith('http://localhost:8001/requests/1/response-details?offset=0&limit=50', { timeout: 30000 })
    })

    it('correctly sets the jsonpath if severity is provided', async () => {
      axios.get.mockResolvedValue({
        headers: {
          'x-pagination-total-results': 1,
          'x-pagination-offset': 0,
          'x-pagination-limit': 50
        },
        data: {
          'error-summary': ['error1', 'error2']
        }
      })

      const response = {
        id: 1,
        getColumnFieldLog: () => []
      }
      const requestData = new RequestData(response)

      await requestData.fetchResponseDetails(0, 50, 'error')

      expect(axios.get).toHaveBeenCalledWith(`http://localhost:8001/requests/1/response-details?offset=0&limit=50&jsonpath=${encodeURIComponent('$.issue_logs[*].severity=="error"')}`, { timeout: 30000 })
    })
  })

  describe('getErrorSummary', () => {
    it('should return the error summary from the response', () => {
      const response = {
        data: {
          'error-summary': ['error1', 'error2']
        }
      }
      const requestData = new RequestData({ response })

      const errorSummary = requestData.getErrorSummary()

      expect(errorSummary).toStrictEqual(['error1', 'error2'])
    })

    it('should return an empty array if there is no error summary and log an error', () => {
      const response = {}
      const requestData = new RequestData(response)

      const errorSummary = requestData.getErrorSummary()

      expect(errorSummary).toStrictEqual([])

      expect(logger.error).toHaveBeenCalledWith('trying to get error summary when there is none: request id: undefined')
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

    it('should return an unknown error if there is no error and log an error', () => {
      const requestData = new RequestData({})

      const error = requestData.getError()

      expect(error).toStrictEqual({ message: 'An unknown error occurred.' })

      expect(logger.error).toHaveBeenCalledWith('trying to get error when there are none: request id: undefined')
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

    it('should return true if there are no errors and log an error', () => {
      const requestData = new RequestData({})

      const hasErrors = requestData.hasErrors()

      expect(hasErrors).toBe(true)

      expect(logger.error).toHaveBeenCalledWith('trying to check for errors when there are none: request id: undefined')
    })

    it('should return true if there is no error summary and log an error', () => {
      const response = {
        data: {}
      }
      const requestData = new RequestData({ response })

      const hasErrors = requestData.hasErrors()

      expect(hasErrors).toBe(true)

      expect(logger.error).toHaveBeenCalledWith('trying to check for errors but there is no error-summary: request id: undefined')
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

    it('should return an empty array if there is no column field log and log an error', () => {
      const requestData = new RequestData({})

      const columnFieldLog = requestData.getColumnFieldLog()

      expect(columnFieldLog).toStrictEqual([])

      expect(logger.error).toHaveBeenCalledWith('trying to get column field log when there is none: request id: undefined')
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
