import { describe, it, expect, vi } from 'vitest'
import { prepareDatasetOverviewTemplateParams, setNoticesFromSourceKey } from '../../../src/middleware/datasetOverview.middleware.js'

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
        sources: [
          { endpoint_url: 'endpoint1', documentation_url: 'doc-url1', status: '200', endpoint_entry_date: 'LU1', latest_log_entry_date: 'LA1' },
          { endpoint_url: 'endpoint2', documentation_url: 'doc-url2', status: '404', exception: 'exception', endpoint_entry_date: 'LU2', latest_log_entry_date: 'LA2' }
        ],
        issues: [
          {
            issue: 'Example issue 1',
            issue_type: 'Example issue type 1',
            field: 'Example issue field 1',
            num_issues: 1,
            status: 'Error'
          }
        ],
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
            { name: 'Data Url 0', endpoint: 'endpoint1', documentation_url: 'doc-url1', error: undefined, lastAccessed: 'LA1', lastUpdated: 'LU1' },
            { name: 'Data Url 1', endpoint: 'endpoint2', documentation_url: 'doc-url2', error: { code: 404, exception: 'exception' }, lastAccessed: 'LA2', lastUpdated: 'LU2' }
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
        dataset: {
          dataset: 'mock-dataset',
          startDate: '2020-11-01'
        }
      }

      vi.setSystemTime(new Date('2022-02-01'))

      setNoticesFromSourceKey('dataset')(reqWithDataset, res, () => {})

      expect(reqWithDataset.notice).toEqual({
        deadline: '31 March 2022',
        type: 'due'
      })
    })

    it('should set notice for overdue dataset', () => {
      const reqWithDataset = {
        ...req,
        dataset: {
          dataset: 'mock-dataset',
          startDate: '2020-01-01'
        }
      }

      vi.setSystemTime(new Date('2021-11-01'))

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
        dataset: {
          dataset: 'unknown-dataset',
          startDate: '2022-01-01'
        }
      }

      setNoticesFromSourceKey('dataset')(reqWithDataset, res, () => {})
      expect(reqWithDataset.notice).toBeUndefined()
    })
  })
})
