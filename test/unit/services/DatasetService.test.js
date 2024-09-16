import { describe, it, expect, vi } from 'vitest'
import { getGeometryEntriesForResourceId, getDatasetStats } from '../../../src/services/DatasetService.js'
import datasette from '../../../src/services/datasette'

vi.mock('../../../src/services/datasette')

describe('DatasetService', () => {
  describe('getGeometryEntriesForResourceId', () => {
    it('should return geometry entries for a given resource ID', async () => {
      const mockData = {
        formattedData: [
          { rowid: 1, end_date: '2023-01-01', fact: 'fact1', entry_date: '2023-01-01', entry_number: 1, resource: 'resource1', start_date: '2023-01-01', entity: 'entity1', field: 'geometry', value: 'value1' }
        ]
      }
      datasette.runQuery.mockResolvedValue(mockData)

      const result = await getGeometryEntriesForResourceId('dataset1', 'resource1')
      expect(result).toEqual(mockData.formattedData)
    })

    it('should return an empty array if no data is found', async () => {
      datasette.runQuery.mockResolvedValue({ formattedData: [] })

      const result = await getGeometryEntriesForResourceId('dataset1', 'resource1')
      expect(result).toEqual([])
    })
  })

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
})
