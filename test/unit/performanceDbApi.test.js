import { vi, it, describe, expect } from 'vitest'
import datasette from '../../src/services/datasette'
import performanceDbApi from '../../src/services/performanceDbApi'

describe('performanceDbApi', () => {
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
            http_status: '404'
          },
          {
            organisation: 'some-organisation',
            name: 'Some Organisation',
            dataset: 'dataset-slug-2',
            endpoint: 'https://example.com/endpoint-2',
            exception: 'resource not found',
            http_status: '404'
          },
          {
            organisation: 'some-organisation',
            name: 'Some Organisation',
            dataset: 'dataset-slug-3',
            endpoint: 'https://example.com/endpoint-3',
            http_status: '200',
            issue_count: 4
          }
        ]
      }

      vi.spyOn(datasette, 'runQuery').mockResolvedValue(mockResponse)

      const result = await performanceDbApi.getLpaOverview(lpa)

      expect(datasette.runQuery).toHaveBeenCalledTimes(1)
      expect(datasette.runQuery).toHaveBeenCalledWith(expect.stringContaining(lpa))
      expect(result).toEqual({
        name: 'Some Organisation',
        datasets: {
          'dataset-slug-1': { endpoint: 'https://example.com/endpoint-1', error: 'endpoint returned with a status of 404', issue: undefined },
          'dataset-slug-2': { endpoint: 'https://example.com/endpoint-2', error: 'resource not found', issue: undefined },
          'dataset-slug-3': { endpoint: 'https://example.com/endpoint-3', error: undefined, issue: 'There are 4 issues in this dataset' }
        }
      })
    })

    it('returns an error if the query fails', async () => {
      const lpa = 'some-lpa-id'
      const error = new Error('query failed')
      vi.spyOn(datasette, 'runQuery').mockRejectedValue(error)

      await expect(performanceDbApi.getLpaOverview(lpa)).rejects.toThrowError('query failed')
    })
  })
})
