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
})
