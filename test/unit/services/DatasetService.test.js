import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFieldStats, getSpecifications } from '../../../src/services/DatasetService.js'
import datasette from '../../../src/services/datasette.js'

vi.mock('../../../src/services/datasette')

describe('DatasetService', () => {
  describe('getSpecifications', () => {
    beforeEach(() => {
      datasette.runQuery.mockReturnValue({
        formattedData: [
          {
            datasets: 'dataset1',
            json: "[{'key': 'value'}]"
          },
          {
            datasets: 'dataset2;dataset3',
            json: "[{'key2': 'value2'},{'key3': 'value3'}]"
          },
          {
            datasets: 'dataset4',
            json: "[{'key4': 'value4'}]"
          }
        ]
      })
    })

    const expectedSpecifications = {
      dataset1: { key: 'value' },
      dataset2: { key2: 'value2' },
      dataset3: { key3: 'value3' },
      dataset4: { key4: 'value4' }
    }

    it('returns specifications in the correct format', async () => {
      const specifications = await getSpecifications()
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
        json: '[{fields: [{field: "field1"},{field: "field3"}]}]'
      }
    ]

    beforeEach(() => {
      vi.mocked(datasette.runQuery).mockResolvedValueOnce({ formattedData: columnSummary })
      vi.mocked(datasette.runQuery).mockResolvedValueOnce({ formattedData: specifications })
    })

    it('returns field stats', async () => {
      const fieldStats = await getFieldStats('lpa', 'dataset1')
      expect(fieldStats).toEqual({
        numberOfFieldsSupplied: 2,
        numberOfFieldsMatched: 1,
        NumberOfExpectedFields: 2
      })
    })

    it('returns null if dataset specification is missing', async () => {
      const fieldStats = await getFieldStats('lpa', 'nonExistentDataset')
      expect(fieldStats).toBeNull()
    })
  })
})
