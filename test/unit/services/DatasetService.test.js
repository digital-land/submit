import { describe, it, expect, vi } from 'vitest'
import { getGeometryEntriesForResourceId, getDatasetStatsForResourceId, getDatasetStats, getLatestDatasetResourceForLpa } from '../../../src/services/DatasetService.js'
import datasette from '../../../src/services/datasette'

vi.mock('../../../src/services/datasette')

describe('DatasetService', () => {
  describe('getLatestDatasetResourcesForLpa', () => {
    it('should return the latest dataset resources for a given LPA', async () => {
      const mockData = {
        formattedData: [
          { resource: 'resource1', status: 'active', endpoint: 'endpoint1', endpoint_url: 'url1', days_since_200: 5, exception: null }
        ]
      }
      datasette.runQuery.mockResolvedValue(mockData)

      const result = await getLatestDatasetResourceForLpa('dataset1', 'lpa1')
      expect(result).toEqual(mockData.formattedData[0])
    })

    it('should return undefined if no data is found', async () => {
      datasette.runQuery.mockResolvedValue({ formattedData: [] })

      const result = await getLatestDatasetResourceForLpa('dataset1', 'lpa1')
      expect(result).toBeUndefined()
    })
  })

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

  describe('getDatasetStatsForResourceId', () => {
    it('should return dataset stats for a given resource ID', async () => {
      const mockStats = [
        { metric: 'number_of_records', value: 10 },
        { metric: 'number_of_fields_supplied', value: 5 }
      ]
      datasette.runQuery.mockResolvedValue({ formattedData: mockStats })

      const result = await getDatasetStatsForResourceId('dataset1', 'resource1')
      expect(result).toEqual(mockStats)
    })

    it('should return an empty array if no data is found', async () => {
      datasette.runQuery.mockResolvedValue({ formattedData: [] })

      const result = await getDatasetStatsForResourceId('dataset1', 'resource1')
      expect(result).toEqual([])
    })
  })

  describe('getDatasetStats', () => {
    it('should return dataset stats for a given LPA', async () => {
      const mockStats = [
        { metric: 'number_of_records', value: 10 },
        { metric: 'number_of_fields_supplied', value: 5 }
      ]

      datasette.runQuery.mockResolvedValue({ formattedData: mockStats })

      const result = await getDatasetStats('dataset1', 'lpa1')
      expect(result).toEqual(mockStats)
    })

    it('should return an empty object if an error occurs', async () => {
      datasette.runQuery.mockRejectedValue(new Error('Test error'))

      const result = await getDatasetStats('dataset1', 'lpa1')
      expect(result).toEqual({})
    })
  })
})
