import { vi, it, describe, expect, beforeEach } from 'vitest'
import datasette from '../../src/services/datasette'
// import performanceDbApi from
import fs from 'fs'

vi.mock('../../config/index.js', () => {
  return {
    default: {
      environment: 'test'
    }
  }
})

vi.mock('fs')

describe('performanceDbApi', () => {
  let performanceDbApi
  beforeEach(async () => {
    fs.createReadStream.mockImplementation((filePath) => {
      const entitiesFile = filePath.includes('entity')
      return {
        pipe: vi.fn().mockReturnValue({
          on: vi.fn((event, callback) => {
            /*  eslint-disable n/no-callback-literal */
            callback({
              issue_type: 'some_issue_type',
              singular_message: entitiesFile ? 'singular entities message for {column_name}' : 'singular message for {column_name}',
              plural_message: entitiesFile ? 'plural entities message for {column_name} with count {num_issues}' : 'plural message for {column_name} with count {num_issues}',
              allRows_message: 'all rows message for {column_name}'
            })
            /* eslint-enable n/no-callback-literal */

            return {
              on: vi.fn((event, callback) => {
                callback()
              })
            }
          })
        })
      }
    })

    performanceDbApi = (await import('../../src/services/performanceDbApi')).default
  })
  describe('getLpaOverview', () => {
    it('calls datasette.runQuery with the correct query', async () => {
      const lpa = 'some-lpa-id'
      const mockResponse = {
        formattedData: [
          {
            organisation: 'some-organisation',
            name: 'Some Organisation',
            dataset: 'dataset-slug-1',
            endpoint: 'https://example.com/endpoint-1',
            exception: null,
            http_status: undefined,
            error: undefined,
            status: 'Live'
          }
        ]
      }

      vi.spyOn(datasette, 'runQuery').mockResolvedValue(mockResponse)

      await performanceDbApi.getLpaOverview(lpa)

      expect(datasette.runQuery).toHaveBeenCalledTimes(1)
      expect(datasette.runQuery).toHaveBeenCalledWith(expect.stringContaining(lpa))
    })

    it('adds the filter if a dataset list is passed into the params', async () => {
      vi.spyOn(datasette, 'runQuery').mockResolvedValue({ formattedData: [{ name: '' }] })

      await performanceDbApi.getLpaOverview('lpa', { datasetsFilter: ['mock1', 'mock2', 'mock3'] })

      expect(datasette.runQuery).toHaveBeenCalledTimes(1)
      expect(datasette.runQuery).toHaveBeenCalledWith(expect.stringContaining('AND rle.pipeline in (\'mock1\',\'mock2\',\'mock3\')'))
    })

    it('returns an error if the query fails', async () => {
      const lpa = 'some-lpa-id'
      const error = new Error('query failed')
      vi.spyOn(datasette, 'runQuery').mockRejectedValue(error)

      await expect(performanceDbApi.getLpaOverview(lpa)).rejects.toThrowError('query failed')
    })
  })

  describe('getTaskMessage', () => {
    it('returns a message for a known issue type with no field provided', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 1 })
      expect(message).toBeDefined()
      expect(message).toContain('singular message')
    })

    it('returns a message with the correct field replacement', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 1, field: 'my_field' })
      expect(message).toContain('my_field')
    })

    it('returns a singular message for num_issues === 1', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 1 })
      expect(message).toContain('singular message for value')
    })

    it('returns a plural message for num_issues > 1', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 2 })
      expect(message).toContain('plural message for value with count 2')
    })

    it('returns an entity-level message when entityLevel is true', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 1, entityCount: 2 }, true)
      expect(message).toContain('singular entities message for value')
    })

    it('returns an "all rows" message when num_issues >= entityCount', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'some_issue_type', num_issues: 5, entityCount: 5, field: 'some_field' })
      expect(message).toContain('all rows message for some_field')
    })

    it('returns a fallback message when the issue type is unknown', () => {
      const message = performanceDbApi.getTaskMessage({ issue_type: 'unknown_issue_type', num_issues: 1 })
      expect(message).toContain('1 issue of type unknown_issue_type')
    })
  })
})
