/* eslint no-import-assign: 0 */
import { describe, it, expect, vi } from 'vitest'
import { prepareDatasetOverviewTemplateParams, setNoticesFromSourceKey } from '../../../src/middleware/datasetOverview.middleware.js'
import * as utils from '../../../src/utils/utils.js'

describe('Dataset Overview Middleware', () => {
  const req = {
    params: {
      lpa: 'mock-lpa',
      dataset: 'mock-dataset'
    },
    dataset: {
      name: 'mock dataset',
      dataset: 'mock-dataset',
      collection: 'mock-collection'
    }
  }
  const res = {}

  describe('prepareDatasetOverviewTemplateParams', () => {
    it('should prepare template params for dataset overview', async () => {
      const reqWithResults = {
        ...req,
        orgInfo: { name: 'mock-org' },
        datasetSpecification: { fields: [{ field: 'field1' }, { field: 'field2' }] },
        columnSummary: [{ mapping_field: 'field1', non_mapping_field: 'field3' }],
        entityCount: { entity_count: 10 },
        resources: [
          { endpoint_url: 'endpoint1', documentation_url: 'doc-url1', status: '200', endpoint_entry_date: 'LU1', latest_log_entry_date: 'LA1', resource_start_date: '2023-01-01' },
          { endpoint_url: 'endpoint2', documentation_url: 'doc-url2', status: '404', exception: 'exception', endpoint_entry_date: 'LU2', latest_log_entry_date: 'LA2', resource_start_date: '2023-01-02' }
        ],
        entryIssueCounts: [
          {
            issue: 'Example issue 1',
            issue_type: 'Example issue type 1',
            field: 'Example issue field 1',
            num_issues: 1,
            status: 'Error'
          }
        ],
        entityIssueCounts: [],
        notice: undefined
      }
      prepareDatasetOverviewTemplateParams(reqWithResults, res, () => {})
      expect(reqWithResults.templateParams).toEqual({
        organisation: { name: 'mock-org' },
        dataset: reqWithResults.dataset,
        taskCount: 1,
        stats: {
          numberOfFieldsSupplied: 1,
          numberOfFieldsMatched: 1,
          numberOfExpectedFields: 2,
          numberOfRecords: 10,
          endpoints: [
            { name: 'Data Url 0', endpoint: 'endpoint1', documentation_url: 'doc-url1', error: undefined, lastAccessed: 'LA1', lastUpdated: '2023-01-01' },
            { name: 'Data Url 1', endpoint: 'endpoint2', documentation_url: 'doc-url2', error: { code: 404, exception: 'exception' }, lastAccessed: 'LA2', lastUpdated: '2023-01-02' }
          ]
        },
        notice: undefined
      })
    })
  })

  describe('setNoticesFromSourceKey', () => {
    vi.mock('../../../src/utils/utils.js', async (importOrigional) => {
      const actual = await importOrigional()

      return {
        ...actual,
        requiredDatasets: [
          {
            dataset: 'mock-dataset',
            deadline: '2022-03-31T14:30:00Z',
            noticePeriod: 2
          }
        ],
        getDeadlineHistory: vi.fn(() => ({
          deadlineDate: new Date('2022-03-31T14:30:00Z'),
          lastYearDeadline: new Date('2021-03-31T14:30:00Z'),
          twoYearsAgoDeadline: new Date('2020-03-31T14:30:00Z')
        }))
      }
    })

    it('should set notice for due dataset', () => {
      const reqWithDataset = {
        ...req,
        dataset: [
          {
            dataset: 'mock-dataset',
            start_date: '2020-11-01'
          }
        ]
      }

      vi.setSystemTime(new Date('2022-02-01T00:00:00Z'))

      setNoticesFromSourceKey('dataset')(reqWithDataset, res, () => {})

      expect(reqWithDataset.notice).toEqual({
        deadline: '31 March 2022',
        type: 'due'
      })
    })

    it('should set notice for overdue dataset', () => {
      const reqWithDataset = {
        ...req,
        dataset: [
          {
            dataset: 'mock-dataset',
            start_date: '2020-01-01'
          }
        ]
      }

      vi.setSystemTime(new Date('2021-11-01T00:00:00Z'))

      setNoticesFromSourceKey('dataset')(reqWithDataset, res, () => {})
      expect(reqWithDataset.notice).toEqual({
        deadline: '31 March 2022',
        type: 'overdue'
      })
    })

    it('should not set notice if deadline is not found', () => {
      const reqWithDataset = {
        params: {
          lpa: 'mock-lpa',
          dataset: 'unknown-dataset'
        },
        dataset: [
          {
            dataset: 'unknown-dataset',
            start_date: '2022-01-01'
          }
        ]
      }

      setNoticesFromSourceKey('dataset')(reqWithDataset, res, () => {})
      expect(reqWithDataset.notice).toBeUndefined()
    })

    it('should set notice for due dataset at notice period boundary', () => {
      const reqWithDataset = {
        ...req,
        dataset: [
          {
            dataset: 'mock-dataset',
            start_date: '2020-11-01'
          }
        ]
      }

      vi.setSystemTime(new Date('2022-02-01T15:30:00Z'))

      setNoticesFromSourceKey('dataset')(reqWithDataset, res, () => {})

      expect(reqWithDataset.notice).toEqual({
        deadline: '31 March 2022',
        type: 'due'
      })
    })

    it('should set notice for due dataset with notice period 1', () => {
      const reqWithDataset = {
        ...req,
        dataset: [
          {
            dataset: 'mock-dataset-2',
            start_date: '2020-11-01'
          }
        ]
      }

      utils.requiredDatasets = [
        {
          dataset: 'mock-dataset',
          deadline: '2022-03-27T14:30:00Z',
          noticePeriod: 1
        }
      ]

      vi.setSystemTime(new Date('2022-03-20T00:00:00Z'))

      setNoticesFromSourceKey('dataset')(reqWithDataset, res, () => {})

      expect(reqWithDataset.notice).toEqual({
        deadline: '31 March 2022',
        type: 'due'
      })
    })

    it('should not set notice for due dataset with notice period 0', () => {
      const reqWithDataset = {
        ...req,
        dataset: [
          {
            dataset: 'mock-dataset-3',
            start_date: '2020-11-01'
          }
        ]
      }

      utils.requiredDatasets = [
        {
          dataset: 'mock-dataset',
          deadline: '2022-03-31T14:30:00Z',
          noticePeriod: 0
        }
      ]

      vi.setSystemTime(new Date('2022-03-31T00:00:00Z'))

      setNoticesFromSourceKey('dataset')(reqWithDataset, res, () => {})

      expect(reqWithDataset.notice).toBeUndefined()
    })
  })
})
