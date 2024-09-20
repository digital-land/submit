import { describe, it, expect, vi, beforeEach } from 'vitest'
import { datasetService } from '../../../src/services/DatasetService.js'
import datasette from '../../../src/services/datasette.js'
import performanceDbApi from '../../../src/services/performanceDbApi.js'

vi.mock('../../../src/services/datasette')
vi.mock('../../../src/services/performanceDbApi.js')

describe('DatasetService', () => {
  describe('getSpecifications', () => {
    beforeEach(() => {
      datasette.runQuery.mockReturnValue({
        formattedData: [
          {
            datasets: 'dataset1',
            json: "[{'dataset': 'dataset1', 'key': 'value'}]"
          },
          {
            datasets: 'dataset2;dataset3',
            json: "[{'dataset': 'dataset2', 'key2': 'value2'},{'dataset': 'dataset3', 'key3': 'value3'}]"
          },
          {
            datasets: 'dataset4',
            json: "[{'dataset': 'dataset4', 'key4': 'value4'}]"
          }
        ]
      })
    })

    const expectedSpecifications = {
      dataset1: { dataset: 'dataset1', key: 'value' },
      dataset2: { dataset: 'dataset2', key2: 'value2' },
      dataset3: { dataset: 'dataset3', key3: 'value3' },
      dataset4: { dataset: 'dataset4', key4: 'value4' }
    }

    it('returns specifications in the correct format', async () => {
      const specifications = await datasetService.getSpecifications()
      expect(specifications).toEqual(expectedSpecifications)
    })
  })

  describe('getFieldStats', () => {
    const columnSummary = [
      {
        matching_field: 'field1,field2',
        non_matching_field: 'field3,field4'
      }
    ]

    const specifications = [
      {
        datasets: 'dataset1',
        json: '[{dataset: "dataset1", fields: [{field: "field1"},{field: "field3"}]}]'
      }
    ]

    beforeEach(() => {
      vi.mocked(datasette.runQuery).mockResolvedValueOnce({ formattedData: columnSummary })
      vi.mocked(datasette.runQuery).mockResolvedValueOnce({ formattedData: specifications })
    })

    it('returns field stats', async () => {
      const fieldStats = await datasetService.getFieldStats('lpa', 'dataset1')
      expect(fieldStats).toEqual({
        numberOfFieldsSupplied: 2,
        numberOfFieldsMatched: 1,
        numberOfExpectedFields: 2
      })
    })

    it('returns null if dataset specification is missing', async () => {
      const fieldStats = await datasetService.getFieldStats('lpa', 'nonExistentDataset')
      expect(fieldStats).toBeNull()
    })
  })

  describe('getDatasetStats', async () => {
    const lpa = 'lpa-example'
    const dataset = 'dataset-example'
    const organisation = 'organisation-example'

    const getFieldStatsSpy = vi.spyOn(datasetService, 'getFieldStats')
    const getSourcesSpy = vi.spyOn(datasetService, 'getSources')

    beforeEach(() => {
      getFieldStatsSpy.mockImplementation(() => {
        return {
          numberOfFieldsSupplied: 2,
          numberOfFieldsMatched: 1,
          numberOfExpectedFields: 2
        }
      })
      getSourcesSpy.mockImplementation(() => [
        {
          status: 200,
          endpoint_url: 'https://example.com/endpoint1',
          documentation_url: 'https://example.com/doc1',
          latest_log_entry_date: '2023-02-20T14:30:00Z',
          endpoint_entry_date: '2023-02-19T12:00:00Z'
        },
        {
          status: 404,
          endpoint_url: 'https://example.com/endpoint2',
          documentation_url: 'https://example.com/doc2',
          latest_log_entry_date: '2023-02-20T14:30:00Z',
          endpoint_entry_date: '2023-02-19T12:00:00Z',
          exception: 'Not Found'
        }
      ])
      performanceDbApi.getEntityCount = vi.fn().mockResolvedValueOnce(100)
    })

    it('returns dataset stats with field stats and sources', async () => {
      const datasetStats = await datasetService.getDatasetStats({ dataset, lpa, organisation })

      expect(datasetStats).toEqual({
        numberOfFieldsSupplied: 2,
        numberOfFieldsMatched: 1,
        numberOfExpectedFields: 2,
        numberOfRecords: 100,
        endpoints: [
          {
            name: 'Data Url 0',
            endpoint: 'https://example.com/endpoint1',
            documentation_url: 'https://example.com/doc1',
            lastAccessed: '2023-02-20T14:30:00Z',
            lastUpdated: '2023-02-19T12:00:00Z'
          },
          {
            name: 'Data Url 1',
            endpoint: 'https://example.com/endpoint2',
            documentation_url: 'https://example.com/doc2',
            lastAccessed: '2023-02-20T14:30:00Z',
            lastUpdated: '2023-02-19T12:00:00Z',
            error: {
              code: 404,
              exception: 'Not Found'
            }
          }
        ]
      })
    })

    it('returns 0s if getFieldStats returns null', async () => {
      getFieldStatsSpy.mockResolvedValueOnce(null)
      const datasetStats = await datasetService.getDatasetStats({ dataset, lpa, organisation })
      expect(datasetStats).toEqual({
        numberOfFieldsSupplied: 0,
        numberOfFieldsMatched: 0,
        numberOfExpectedFields: 0,
        numberOfRecords: 100,
        endpoints: [
          {
            name: 'Data Url 0',
            endpoint: 'https://example.com/endpoint1',
            documentation_url: 'https://example.com/doc1',
            lastAccessed: '2023-02-20T14:30:00Z',
            lastUpdated: '2023-02-19T12:00:00Z'
          },
          {
            name: 'Data Url 1',
            endpoint: 'https://example.com/endpoint2',
            documentation_url: 'https://example.com/doc2',
            lastAccessed: '2023-02-20T14:30:00Z',
            lastUpdated: '2023-02-19T12:00:00Z',
            error: {
              code: 404,
              exception: 'Not Found'
            }
          }
        ]
      })
    })

    it('throws an error if getFieldStats throws an error', async () => {
      getFieldStatsSpy.mockRejectedValueOnce(new Error('Error fetching sources'))
      await expect(datasetService.getDatasetStats({ dataset, lpa, organisation })).rejects.toThrowError('Error fetching sources')
    })

    it('throws an error if getSources throws an error', async () => {
      getSourcesSpy.mockRejectedValueOnce(new Error('Error fetching sources'))
      await expect(datasetService.getDatasetStats({ dataset, lpa, organisation })).rejects.toThrowError('Error fetching sources')
    })
  })
})
