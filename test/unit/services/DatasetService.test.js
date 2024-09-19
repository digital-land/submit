import { describe, it, expect, vi } from 'vitest'
import { getDatasetStats, getSpecifications } from '../../../src/services/DatasetService.js'
import datasette from '../../../src/services/datasette'

vi.mock('../../../src/services/datasette')

describe('DatasetService', () => {
  describe('getDatasetStats', () => {
    it('should return dataset stats for a given LPA', async () => {
      const mockStats = [
        { metric: 'numberOfRecords', value: 10 },
        { metric: 'numberOfFieldsSupplied', value: 5 }
      ]
      datasette.runQuery.mockResolvedValue({ formattedData: mockStats })

      const result = await getDatasetStats('dataset1', 'lpa1')
      expect(result).toEqual({
        numberOfRecords: 10,
        numberOfFieldsSupplied: 5
      })
    })

    it('should return an empty object if an error occurs', async () => {
      datasette.runQuery.mockRejectedValue(new Error('Test error'))

      const result = await getDatasetStats('dataset1', 'lpa1')
      expect(result).toEqual({})
    })
  })

  describe('getSpecifications', async () => {
    it('can get specs', async () => {
      const specifications = await getSpecifications()
      expect(specifications).toBeDefined()
    })
  })
})
