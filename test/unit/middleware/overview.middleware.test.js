import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { addNoticesToDatasets, aggregateOverviewData, datasetSubmissionDeadlineCheck, getOverview, prepareOverviewTemplateParams } from '../../../src/middleware/overview.middleware'
import { setupNunjucks } from '../../../src/serverSetup/nunjucks.js'
import jsdom from 'jsdom'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

vi.mock('../../../src/utils/utils.js', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    dataSubjects: {},
    getDeadlineHistory: () => ({
      deadlineDate: new Date('1996-04-17T10:00:00.000z'),
      lastYearDeadline: new Date('1995-04-17T10:00:00.000z'),
      twoYearsAgoDeadline: new Date('1994-04-17T10:00:00.000z')
    })
  }
})

const exampleLpa = { name: 'Example LPA', organisation: 'LPA' }

const reqTemplate = {
  params: { lpa: 'LPA' },
  orgInfo: exampleLpa,
  datasets: [
    {
      dataset: 'dataset1',
      issue_count: 0,
      endpoint: 'https://example.com',
      error: undefined,
      status: 'Live'
    },
    {
      dataset: 'dataset2',
      issue_count: 0,
      endpoint: null,
      error: undefined,
      status: 'Needs fixing'
    },
    {
      dataset: 'dataset3',
      issue_count: 0,
      endpoint: 'https://example.com',
      error: undefined,
      status: 'Error'
    },
    {
      dataset: 'dataset4',
      issue_count: 0,
      endpoint: null,
      error: 'There was a 404 error',
      status: 'Error'
    }

  ],
  provisions: [
    { dataset: 'dataset1', provision_reason: 'statutory', project: 'open-digital-planning' },
    { dataset: 'dataset2', provision_reason: 'expected', project: 'open-digital-planning' },
    { dataset: 'dataset3', provision_reason: 'statutory', project: 'open-digital-planning' },
    { dataset: 'dataset4', provision_reason: 'expected', project: 'open-digital-planning' }
  ],
  datasetErrorStatus: []
}

describe('overview.middleware', () => {
  const getRenderedErrorCards = (templateParams) => {
    const html = nunjucks.render('organisations/overview.html', templateParams)
    const doc = new jsdom.JSDOM(html).window.document
    const errorNodes = doc.querySelectorAll('[data-dataset-status="Error"]')
    return Array.from(errorNodes)
  }

  describe('prepareOverviewTemplateParams', () => {
    it('should render the overview page', async () => {
      const req = structuredClone(reqTemplate)
      const res = { render: vi.fn() }

      prepareOverviewTemplateParams(req, res, () => {})

      const expectedTemplateParams = {
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        datasets: {
          statutory: expect.arrayContaining([
            { endpoint: 'https://example.com', status: 'Live', dataset: 'dataset1', error: undefined, issue_count: 0, project: 'open-digital-planning' },
            { endpoint: 'https://example.com', status: 'Error', dataset: 'dataset3', error: undefined, issue_count: 0, project: 'open-digital-planning' }
          ]),
          other: expect.arrayContaining([
            { endpoint: null, status: 'Needs fixing', dataset: 'dataset2', error: undefined, issue_count: 0, project: 'open-digital-planning' },
            { endpoint: null, status: 'Error', dataset: 'dataset4', error: 'There was a 404 error', issue_count: 0, project: 'open-digital-planning' }
          ])
        },
        totalDatasets: 4,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 2
      }

      expect(req.templateParams).toEqual(expectedTemplateParams)

      const errorCardNodes = getRenderedErrorCards(req.templateParams)
      expect(errorCardNodes[0].querySelector('.govuk-task-list__hint').textContent.trim()).toBe('There was an error accessing the data URL')
      expect(errorCardNodes[1].querySelector('.govuk-task-list__hint').textContent.trim()).toBe('There was a 404 error')
    })

    it('should patch dataset status based on the provision_summary info', () => {
      const req = structuredClone(reqTemplate)
      console.assert(req.datasets[0].status === 'Live')
      req.datasetErrorStatus = [{ dataset: 'dataset1' }]
      const res = { render: vi.fn() }

      prepareOverviewTemplateParams(req, res, () => {})

      const ds1 = req.templateParams.datasets.statutory[0]
      expect(ds1.status).toBe('Error')
      expect(ds1.error).toBeUndefined()

      const ds4 = req.templateParams.datasets.other[1]
      expect(ds4.status).toBe('Error')
      expect(ds4.error).toBe(req.datasets[3].error) // Error message should be left untouched
    })
  })

  describe('aggregateOverviewData middleware', () => {
    const req = { lpaOverview: [] }
    const res = {}
    const next = vi.fn()

    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('should set req.datasets to just the required datasets when input is empty', async () => {
      aggregateOverviewData(req, res, next)
      expect(req.datasets).toEqual([
        { status: 'Not submitted', dataset: 'brownfield-land' }
      ])
    })

    it('should count issues correctly', async () => {
      const exampleData = [
        { endpoint: 'https://example.com', status: 'Live', dataset: 'dataset1', entity_count: 11 },
        { endpoint: null, status: 'Error', dataset: 'dataset2', entity_count: 12, issue_count: 12 },
        { endpoint: 'https://example.com/3', status: 'Needs fixing', dataset: 'dataset3', entity_count: 5, issue_count: 5, fields: 'foo' },
        { endpoint: 'https://example.com/3', status: 'Needs fixing', dataset: 'dataset3', entity_count: 5, issue_count: 2, fields: 'bar' }
      ]

      req.lpaOverview = exampleData

      aggregateOverviewData(req, res, next)

      expect(req.datasets).toEqual([
        { endpoint: 'https://example.com', status: 'Live', dataset: 'dataset1', error: undefined, issue_count: 0 },
        { endpoint: null, status: 'Error', dataset: 'dataset2', error: undefined, issue_count: 0 },
        { endpoint: 'https://example.com/3', status: 'Needs fixing', dataset: 'dataset3', error: undefined, issue_count: 3 },
        { dataset: 'brownfield-land', status: 'Not submitted' }
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

      aggregateOverviewData(req, res, next)

      expect(req.datasets[0].status).toBe('Error')
      expect(req.datasets[1].status).toBe('Needs fixing')
    })

    it('should handle multiple fields', async () => {
      const exampleData = [
        { endpoint: 'https://example.com/2', status: 'Needs fixing', dataset: 'dataset1', entity_count: 5, issue_count: 5, fields: 'foo,bar' },
        { endpoint: 'https://example.com/2', status: 'Needs fixing', dataset: 'dataset2', entity_count: 5, issue_count: 2, fields: 'baz,qux' }
      ]

      req.lpaOverview = exampleData

      aggregateOverviewData(req, res, next)

      expect(req.datasets[0].status).toBe('Needs fixing')
      expect(req.datasets[0].issue_count).toBe(2) // 2 columns affected
      expect(req.datasets[1].status).toBe('Needs fixing')
      expect(req.datasets[1].issue_count).toBe(2) // 2 rows affected (in the same two fields)
    })

    it('should\'t add a required dataset if it is already present', async () => {
      const exampleData = [
        { endpoint: 'https://example.com/2', status: 'Needs fixing', dataset: 'brownfield-land', entity_count: 5, issue_count: 5, fields: 'foo,bar' }
      ]
      req.lpaOverview = exampleData
      aggregateOverviewData(req, res, next)
      expect(req.datasets.length).toEqual(1)
    })
  })

  describe('getOverview', () => {
    it('should call render with the correct template and params', () => {
      const req = {}
      const res = { render: vi.fn() }
      const next = vi.fn()

      req.templateParams = {
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        datasets: {
          statutory: [
            { endpoint: 'https://example.com', status: 'Live', dataset: 'statutory1' }
          ],
          other: [
            { endpoint: 'https://example.com', status: 'Live', dataset: 'dataset1' },
            { endpoint: null, status: 'Needs fixing', dataset: 'dataset2' },
            { endpoint: 'https://example.com', status: 'Error', dataset: 'dataset3' }
          ]
        },
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

  describe('datasetSubmissionDeadlineCheck', () => {
    const req = {
      resourceLookup: []
    }
    const res = {}
    const next = vi.fn()

    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('sets dueNotice flag if they are in the notice period and they haven\'t submitted this year', async () => {
      req.resourceLookup = [
        {
          dataset: 'brownfield-land',
          startDate: '1995-03-17T10:00:00.000z'
        }
      ]

      vi.setSystemTime(new Date('1996-03-03T00:00:00.000Z'))

      await datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(true)
      expect(req.noticeFlags[0].overdueNotice).toBe(false)
    })

    it('sets overdueNotice flag if they haven\'t submitted for last year', async () => {
      req.resourceLookup = [
        {
          dataset: 'brownfield-land',
          startDate: '1994-03-17T10:00:00.000z'
        }
      ]

      vi.setSystemTime(new Date('1995-12-03T00:00:00.000Z'))

      await datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(false)
      expect(req.noticeFlags[0].overdueNotice).toBe(true)
    })

    it('doesn\'t set any flag if they have submitted this year and we are in the notice period', async () => {
      req.resourceLookup = [
        {
          dataset: 'brownfield-land',
          startDate: '1996-03-17T10:00:00.000z'
        }
      ]

      vi.setSystemTime(new Date('1996-03-03T00:00:00.000Z'))

      await datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(false)
      expect(req.noticeFlags[0].overdueNotice).toBe(false)
    })

    it('sets dueNotice flag if they haven\'t ever submitted and we are in the notice period', async () => {
      req.resourceLookup = []

      vi.setSystemTime(new Date('1996-03-03T00:00:00.000Z'))

      await datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(true)
      expect(req.noticeFlags[0].overdueNotice).toBe(false)
    })

    it('sets overdueNotice flag if they haven\'t ever submitted and we are not in the notice period', async () => {
      req.resourceLookup = []

      vi.setSystemTime(new Date('1995-11-03T00:00:00.000Z'))

      await datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(false)
      expect(req.noticeFlags[0].overdueNotice).toBe(true)
    })
  })

  describe('addNoticesToDatasets', () => {
    const req = {
      params: { lpa: 'LPA' },
      datasets: [
        { dataset: 'dataset1', name: 'Dataset 1' },
        { dataset: 'dataset2', name: 'Dataset 2' },
        { dataset: 'dataset3', name: 'Dataset 3' }
      ],
      noticeFlags: [
        { dataset: 'dataset1', dueNotice: true, deadline: new Date('1996-03-17T10:00:00.000z') },
        { dataset: 'dataset2', overdueNotice: true, deadline: new Date('1995-03-17T10:00:00.000z') },
        { dataset: 'dataset3', dueNotice: false, overdueNotice: false }
      ]
    }
    const res = {}
    const next = vi.fn()

    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('adds notices to datasets correctly', () => {
      addNoticesToDatasets(req, res, next)

      expect(req.datasets[0].notice).toEqual({
        deadline: '17 March 1996',
        type: 'due'
      })
      expect(req.datasets[1].notice).toEqual({
        deadline: '17 March 1995',
        type: 'overdue'
      })
      expect(req.datasets[2].notice).toBeUndefined()
    })

    it('calls next function', () => {
      addNoticesToDatasets(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })
})
