import { describe, it, vi, expect } from 'vitest'
import { aggregateOverviewData, datasetSubmissionDeadlineCheck, getOverview, prepareOverviewTemplateParams } from '../../../src/middleware/overview.middleware'
import { afterEach, beforeEach } from 'node:test'

vi.mock(import('../../../src/utils/utils.js'), async (importOriginal) => {
  const origional = await importOriginal()
  return {
    ...origional,
    dataSubjects: {},
    getDeadlineHistory: () => ({
      deadlineDate: new Date('1996-04-17T10:00:00.000z'),
      lastYearDeadline: new Date('1995-04-17T10:00:00.000z'),
      twoYearsAgoDeadline: new Date('1994-04-17T10:00:00.000z')
    })
  }
})

describe('overview.middleware', () => {
  const exampleLpa = { name: 'Example LPA', organisation: 'LPA' }

  describe('prepareOverviewTemplateParams', () => {
    it('should render the overview page', async () => {
      const req = {
        params: { lpa: 'LPA' },
        orgInfo: exampleLpa,
        datasets: [
          {
            slug: 'dataset1',
            issue_count: 0,
            endpoint: 'https://example.com',
            error: undefined,
            status: 'Live'
          },
          {
            slug: 'dataset2',
            issue_count: 0,
            endpoint: null,
            error: undefined,
            status: 'Needs fixing'
          },
          {
            slug: 'dataset3',
            issue_count: 0,
            endpoint: 'https://example.com',
            error: undefined,
            status: 'Error'
          }
        ]
      }
      const res = { render: vi.fn() }

      prepareOverviewTemplateParams(req, res, () => {})

      const expectedTemplateParams = {
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        datasets: expect.arrayContaining([
          { endpoint: 'https://example.com', status: 'Live', slug: 'dataset1', error: undefined, issue_count: 0 },
          { endpoint: null, status: 'Needs fixing', slug: 'dataset2', error: undefined, issue_count: 0 },
          { endpoint: 'https://example.com', status: 'Error', slug: 'dataset3', error: undefined, issue_count: 0 }
        ]),
        totalDatasets: 3,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 1
      }

      expect(req.templateParams).toEqual(expectedTemplateParams)
    })
  })

  describe('aggregateOverviewData middleware', () => {
    const req = { lpaOverview: [] }
    const res = {}
    const next = vi.fn()

    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('should set req.datasets to an empty array when input is empty', async () => {
      await aggregateOverviewData(req, res, next)
      expect(req.datasets).toEqual([])
    })

    it('should count issues correctly', async () => {
      const exampleData = [
        { endpoint: 'https://example.com', status: 'Live', dataset: 'dataset1', entity_count: 11 },
        { endpoint: null, status: 'Error', dataset: 'dataset2', entity_count: 12, issue_count: 12 },
        { endpoint: 'https://example.com/3', status: 'Needs fixing', dataset: 'dataset3', entity_count: 5, issue_count: 5, fields: 'foo' },
        { endpoint: 'https://example.com/3', status: 'Needs fixing', dataset: 'dataset3', entity_count: 5, issue_count: 2, fields: 'bar' }
      ]

      req.lpaOverview = exampleData

      await aggregateOverviewData(req, res, next)

      expect(req.datasets).toEqual([
        { endpoint: 'https://example.com', status: 'Live', slug: 'dataset1', error: undefined, issue_count: 0 },
        { endpoint: null, status: 'Error', slug: 'dataset2', error: undefined, issue_count: 0 },
        { endpoint: 'https://example.com/3', status: 'Needs fixing', slug: 'dataset3', error: undefined, issue_count: 3 }
      ])
    })

    it('should ensure dataset issues get to the surface', async () => {
      const exampleData = [
        { endpoint: 'https://example.com', status: 'Live', dataset: 'dataset1', entity_count: 11 },
        { endpoint: null, status: 'Error', dataset: 'dataset1', entity_count: 12, issue_count: 12 },
        { endpoint: 'https://example.com/2', status: 'Live', dataset: 'dataset2', entity_count: 5, issue_count: 5, fields: 'foo' },
        { endpoint: 'https://example.com/2', status: 'Needs fixing', dataset: 'dataset2', entity_count: 5, issue_count: 2, fields: 'bar' }
      ]

      req.lpaOverview = exampleData

      await aggregateOverviewData(req, res, next)

      expect(req.datasets[0].status).toBe('Error')
      expect(req.datasets[1].status).toBe('Needs fixing')
    })

    it('should handle multiple fields', async () => {
      const exampleData = [
        { endpoint: 'https://example.com/2', status: 'Needs fixing', dataset: 'dataset1', entity_count: 5, issue_count: 5, fields: 'foo,bar' },
        { endpoint: 'https://example.com/2', status: 'Needs fixing', dataset: 'dataset2', entity_count: 5, issue_count: 2, fields: 'baz,qux' }
      ]

      req.lpaOverview = exampleData

      await aggregateOverviewData(req, res, next)

      expect(req.datasets[0].status).toBe('Needs fixing')
      expect(req.datasets[0].issue_count).toBe(2) // 2 columns affected
      expect(req.datasets[1].status).toBe('Needs fixing')
      expect(req.datasets[1].issue_count).toBe(2) // 2 rows affected (in the same two fields)
    })
  })

  describe('getOverview', () => {
    it('should call render with the correct template and params', () => {
      const req = {}
      const res = { render: vi.fn() }
      const next = vi.fn()

      req.templateParams = {
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        datasets: [
          { endpoint: 'https://example.com', status: 'Live', slug: 'dataset1' },
          { endpoint: null, status: 'Needs fixing', slug: 'dataset2' },
          { endpoint: 'https://example.com', status: 'Error', slug: 'dataset3' }
        ],
        totalDatasets: 3,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 1
      }

      getOverview(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/overview.html', req.templateParams)
    })
  })

  describe('datasetSubmissionDeadlineCheck', async () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('sets dueNotice flag if they are in the notice period and they haven\'t submitted this year', async () => {
      const req = {
        resourceLookup: [
          {
            dataset: 'brownfield-land',
            startDate: '1995-03-17T10:00:00.000z'
          }
        ]
      }

      const res = {}
      const next = vi.fn()

      // tell vitest we use mocked time
      vi.useFakeTimers()

      // set hour within business hours
      const date = new Date('1996-03-03T00:00:00.000Z')
      vi.setSystemTime(date)

      datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(true)
      expect(req.noticeFlags[0].overdueNotice).toBe(false)
    })

    it('sets overdue flag if we aren\t yet in the notice period and they haven\'t submitted for last year', async () => {
      const req = {
        resourceLookup: [
          {
            dataset: 'brownfield-land',
            startDate: '1994-03-17T10:00:00.000z'
          }
        ]
      }

      const res = {}
      const next = vi.fn()

      // tell vitest we use mocked time
      vi.useFakeTimers()

      // set hour within business hours
      const date = new Date('1995-12-03T00:00:00.000Z')
      vi.setSystemTime(date)

      datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(false)
      expect(req.noticeFlags[0].overdueNotice).toBe(true)
    })

    it('doesn\t set any flag if they have submitted this year and we are in the notice period', async () => {
      const req = {
        resourceLookup: [
          {
            dataset: 'brownfield-land',
            startDate: '1996-03-17T10:00:00.000z'
          }
        ]
      }

      const res = {}
      const next = vi.fn()

      // tell vitest we use mocked time
      vi.useFakeTimers()

      // set hour within business hours
      const date = new Date('1996-03-03T00:00:00.000Z')
      vi.setSystemTime(date)

      datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(false)
      expect(req.noticeFlags[0].overdueNotice).toBe(false)
    })

    it('sets the due flag if they haven\'t ever submitted and we are in the notice period', async () => {
      const req = {
        resourceLookup: []
      }

      const res = {}
      const next = vi.fn()

      // tell vitest we use mocked time
      vi.useFakeTimers()

      // set hour within business hours
      const date = new Date('1996-03-03T00:00:00.000Z')
      vi.setSystemTime(date)

      datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(true)
      expect(req.noticeFlags[0].overdueNotice).toBe(false)
    })

    it('sets the overdue flag if they haven\'t ever submitted and we are not the notice period', async () => {
      const req = {
        resourceLookup: []
      }

      const res = {}
      const next = vi.fn()

      // tell vitest we use mocked time
      vi.useFakeTimers()

      // set hour within business hours
      const date = new Date('1995-11-03T00:00:00.000Z')
      vi.setSystemTime(date)

      datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(false)
      expect(req.noticeFlags[0].overdueNotice).toBe(true)
    })
  })

  describe('addNoticesToDatasets', () => {

  })
})
