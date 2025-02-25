import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { addNoticesToDatasets, datasetSubmissionDeadlineCheck, getOverview, prepareOverviewTemplateParams } from '../../../src/middleware/overview.middleware'
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
      issueCount: 0,
      endpointCount: 1,
      error: undefined,
      status: 'Live'
    },
    {
      dataset: 'dataset2',
      issueCount: 0,
      endpointCount: 0,
      error: undefined,
      status: 'Needs fixing'
    },
    {
      dataset: 'dataset3',
      issueCount: 0,
      endpointCount: 1,
      error: undefined,
      status: 'Error'
    },
    {
      dataset: 'dataset4',
      issueCount: 0,
      endpointCount: 0,
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
  /**
   * @param {Object} templateParams
   * @returns {{ errorCards: Object[], doc: Document }}
   */
  const getRenderedErrorCards = (templateParams) => {
    const html = nunjucks.render('organisations/overview.html', templateParams)
    const doc = new jsdom.JSDOM(html).window.document
    const errorNodes = doc.querySelectorAll('[data-dataset-status="Error"]')
    const errorCards = Array.from(errorNodes)
    return { errorCards, doc }
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
            { endpointCount: 1, status: 'Live', dataset: 'dataset1', error: undefined, issueCount: 0 },
            { endpointCount: 1, status: 'Error', dataset: 'dataset3', error: undefined, issueCount: 0 }
          ]),
          other: expect.arrayContaining([
            { endpointCount: 0, status: 'Needs fixing', dataset: 'dataset2', error: undefined, issueCount: 0 },
            { endpointCount: 0, status: 'Error', dataset: 'dataset4', error: 'There was a 404 error', issueCount: 0 }
          ])
        },
        totalDatasets: 4,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 2,
        isOPDMember: true
      }

      expect(req.templateParams).toEqual(expectedTemplateParams)

      const { errorCards: errorCardNodes, doc } = getRenderedErrorCards(req.templateParams)
      expect(errorCardNodes[0].querySelector('.govuk-task-list__hint').textContent.trim()).toBe('There was an error accessing the endpoint URL')
      expect(errorCardNodes[1].querySelector('.govuk-task-list__hint').textContent.trim()).toBe('There was a 404 error')

      const orgMemebershipInfo = doc.querySelector('.org-membership-info').textContent.trim()
      expect(orgMemebershipInfo).toMatch('is a member of the Open Digital Planning programme')

      // verify proper label for non-OPD memebers gets rendered
      const reqNotMember = structuredClone(reqTemplate)
      reqNotMember.provisions.forEach((provision) => {
        provision.project = ''
      })
      prepareOverviewTemplateParams(reqNotMember, res, () => {})
      const { doc: docNotMember } = getRenderedErrorCards(reqNotMember.templateParams)
      expect(docNotMember.querySelector('.org-membership-info').textContent.trim()).toMatch('is not a member of the Open Digital Planning programme')
    })

    it('should patch dataset status based on the provision_summary info', () => {
      const req = structuredClone(reqTemplate)
      console.assert(req.datasets[0].status === 'Live')
      req.datasetErrorStatus = [{ dataset: 'dataset1' }]
      const res = { render: vi.fn() }

      prepareOverviewTemplateParams(req, res, () => {})

      const ds1 = req.templateParams.datasets.statutory[0]
      expect(ds1.status).toBe('Live')
      expect(ds1.error).toBeUndefined()

      const ds4 = req.templateParams.datasets.other[1]
      expect(ds4.status).toBe('Error')
      expect(ds4.error).toBe(req.datasets[3].error) // Error message should be left untouched
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
            { endpointCount: 1, status: 'Live', dataset: 'statutory1' }
          ],
          other: [
            { endpointCount: 1, status: 'Live', dataset: 'dataset1' },
            { endpointCount: 1, status: 'Needs fixing', dataset: 'dataset2' },
            { endpointCount: 1, status: 'Error', dataset: 'dataset3' }
          ]
        },
        totalDatasets: 3,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 1,
        isOPDMember: false
      }

      getOverview(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/overview.html', req.templateParams)
    })
  })

  describe('datasetSubmissionDeadlineCheck', () => {
    const req = {
      resources: []
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
      req.resources = {
        'brownfield-land': [
          {
            dataset: 'brownfield-land',
            start_date: '1995-03-17T10:00:00.000z'
          }
        ]
      }

      vi.setSystemTime(new Date('1996-03-03T00:00:00.000Z'))

      await datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(true)
      expect(req.noticeFlags[0].overdueNotice).toBe(false)
    })

    it('sets overdueNotice flag if they haven\'t submitted for last year', async () => {
      req.resources = {
        'brownfield-land': [
          {
            dataset: 'brownfield-land',
            start_date: '1994-03-17T10:00:00.000z'
          }
        ]
      }
      vi.setSystemTime(new Date('1995-12-03T00:00:00.000Z'))

      await datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(false)
      expect(req.noticeFlags[0].overdueNotice).toBe(true)
    })

    it('doesn\'t set any flag if they have submitted this year and we are in the notice period', async () => {
      req.resources = {
        'brownfield-land': [
          {
            dataset: 'brownfield-land',
            start_date: '1996-03-17T10:00:00.000z'
          }
        ]
      }

      vi.setSystemTime(new Date('1996-03-03T00:00:00.000Z'))

      await datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(false)
      expect(req.noticeFlags[0].overdueNotice).toBe(false)
    })

    it('sets dueNotice flag if they haven\'t ever submitted and we are in the notice period', async () => {
      req.resources = []

      vi.setSystemTime(new Date('1996-03-03T00:00:00.000Z'))

      await datasetSubmissionDeadlineCheck(req, res, next)

      expect(req.noticeFlags[0].dueNotice).toBe(true)
      expect(req.noticeFlags[0].overdueNotice).toBe(false)
    })

    it('sets overdueNotice flag if they haven\'t ever submitted and we are not in the notice period', async () => {
      req.resources = []

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
