import RequestData from '../../src/models/requestData'
import ResponseDetails from '../../src/models/responseDetails'
import { describe, it, expect, vi } from 'vitest'
import axios from 'axios'

vi.mock('axios')

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

  })
})
