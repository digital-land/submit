import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { addNoticesToDatasets, datasetSubmissionDeadlineCheck, getOverview, prepareDatasetObjects, prepareOverviewTemplateParams, prepareAuthorityBatch } from '../../../src/middleware/lpa-overview.middleware.js'
import { setupNunjucks } from '../../../src/serverSetup/nunjucks.js'
import jsdom from 'jsdom'
import platformApi from '../../../src/services/platformApi.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

vi.mock('../../../src/services/platformApi.js', () => ({
  default: {
    fetchEntities: vi.fn()
  }
}))

vi.mock('../../../src/utils/utils.js', async (importOriginal) => {
  /** @type {Object} */
  const original = await importOriginal()
  return {
    ...original,
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
  availableDatasets: ['dataset1', 'dataset2', 'dataset3', 'dataset4'],
  datasets: [
    {
      dataset: 'dataset1',
      issueCount: 0,
      endpointCount: 1,
      error: undefined,
      status: 'Live',
      endpointErrorCount: 0
    },
    {
      dataset: 'dataset2',
      issueCount: 0,
      endpointCount: 0,
      error: undefined,
      status: 'Needs improving',
      endpointErrorCount: 0
    },
    {
      dataset: 'dataset3',
      issueCount: 0,
      endpointCount: 1,
      error: undefined,
      status: 'Error',
      endpointErrorCount: 1
    },
    {
      dataset: 'dataset4',
      issueCount: 0,
      endpointCount: 0,
      error: 'There was a 404 error',
      status: 'Error',
      endpointErrorCount: 1
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

describe('lpa-overview.middleware', () => {
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
      req.datasets[1].issueCount = 1
      const res = { render: vi.fn() }

      prepareOverviewTemplateParams(req, res, () => { })

      const expectedTemplateParams = {
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        datasets: {
          statutory: expect.arrayContaining([
            { endpointCount: 1, status: 'Live', dataset: 'dataset1', error: undefined, issueCount: 0, endpointErrorCount: 0 },
            { endpointCount: 1, status: 'Error', dataset: 'dataset3', error: undefined, issueCount: 0, endpointErrorCount: 1 }
          ]),
          expected: expect.arrayContaining([
            { endpointCount: 0, status: 'Needs improving', dataset: 'dataset2', error: undefined, issueCount: 1, endpointErrorCount: 0 },
            { endpointCount: 0, status: 'Error', dataset: 'dataset4', error: 'There was a 404 error', issueCount: 0, endpointErrorCount: 1 }
          ])
        },
        totalDatasets: 4,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 2,
        isODPMember: true
      }

      expect(req.templateParams).toEqual(expectedTemplateParams)

      const { errorCards: errorCardNodes, doc } = getRenderedErrorCards(req.templateParams)
      expect(errorCardNodes[0].querySelector('.govuk-task-list__hint').textContent.trim()).toBe('There was an error accessing the endpoint URL')
      expect(errorCardNodes[1].querySelector('.govuk-task-list__hint').textContent.trim()).toBe('There was a 404 error')

      // Check for ODP membership info in the expected datasets section
      const expectedSection = doc.querySelector('[data-testid="datasetsExpected"]')
      if (expectedSection) {
        const orgMembershipInfo = expectedSection.querySelector('.org-membership-info')
        expect(orgMembershipInfo.textContent.trim()).toMatch(/Open Digital Planning/)
      }

      // verify proper label for non-ODP members gets rendered
      const reqNotMember = structuredClone(reqTemplate)
      reqNotMember.provisions.forEach((provision) => {
        provision.project = ''
      })
      prepareOverviewTemplateParams(reqNotMember, res, () => { })
      const { doc: docNotMember } = getRenderedErrorCards(reqNotMember.templateParams)
      // When not an ODP member, expected datasets won't render (requires isODPMember), so datasetsExpected won't be present
      const expectedSectionNotMember = docNotMember.querySelector('[data-testid="datasetsExpected"]')
      expect(expectedSectionNotMember).toBeNull()
    })

    it('should patch dataset status based on the provision_summary info', () => {
      const req = structuredClone(reqTemplate)
      console.assert(req.datasets[0].status === 'Live')
      req.datasetErrorStatus = [{ dataset: 'dataset1' }]
      const res = { render: vi.fn() }

      prepareOverviewTemplateParams(req, res, () => { })

      const ds1 = req.templateParams.datasets.statutory[0]
      expect(ds1.status).toBe('Live')
      expect(ds1.error).toBeUndefined()

      const ds4 = req.templateParams.datasets.expected[1]
      expect(ds4.status).toBe('Error')
      expect(ds4.error).toBe(req.datasets[3].error) // Error message should be left untouched
    })

    it('should display a combined count of issues and endpoint errors in the dataset', () => {
      const req = structuredClone(reqTemplate)
      req.datasets[1].issueCount = 1
      req.datasets[1].endpointErrorCount = 2
      const res = { render: vi.fn() }

      prepareOverviewTemplateParams(req, res, () => { })

      const { doc } = getRenderedErrorCards(req.templateParams)
      const hint = doc.querySelector('[data-dataset-status="Needs improving"] .govuk-task-list__hint')

      expect(hint?.textContent.trim()).toBe('There are 3 issues in this dataset')
    })

    it('should display a count of issue when there is only one issue', () => {
      const req = structuredClone(reqTemplate)
      req.datasets[1].issueCount = 1
      const res = { render: vi.fn() }

      prepareOverviewTemplateParams(req, res, () => { })

      const { doc } = getRenderedErrorCards(req.templateParams)
      const hint = doc.querySelector('[data-dataset-status="Needs improving"] .govuk-task-list__hint')

      expect(hint?.textContent.trim()).toBe('There is 1 issue in this dataset')
    })
  })

  describe('prepareDatasetObjects()', () => {
    it('should take "out of bound" expectation failures into account', () => {
      const req = {
        expectationOutOfBounds: [],
        issues: {},
        endpoints: { datasetA: [{ latest_status: '200' }] },
        availableDatasets: ['datasetA'],
        datasets: undefined,
        datasetAuthority: {}
      }
      req.expectationOutOfBounds = [{ passed: false, dataset: 'datasetA' }]
      const res = { render: vi.fn() }

      prepareDatasetObjects(req, res, () => { })

      expect(req.datasets[0].error).toBeUndefined()
      expect(req.datasets[0].issueCount).toBe(1)
      expect(req.datasets[0].status).toBe('Needs improving')
    })
    it('should not show an error if atleast one endpoint is 200', () => {
      const req = {
        expectationOutOfBounds: [],
        issues: {},
        endpoints: { datasetA: [{ latest_status: '200' }, { latest_status: '504' }, { latest_status: '504' }] },
        availableDatasets: ['datasetA'],
        datasets: undefined,
        datasetAuthority: {}
      }
      const res = { render: vi.fn() }

      prepareDatasetObjects(req, res, () => { })

      expect(req.datasets[0].error).toBeUndefined()
      expect(req.datasets[0].status).toBe('Needs improving')
    })
    it('should show an error all endpoints have status !== 200', () => {
      const req = {
        expectationOutOfBounds: [],
        issues: {},
        endpoints: { datasetA: [{ latest_status: '504' }, { latest_status: '504' }] },
        availableDatasets: ['datasetA'],
        datasets: undefined,
        datasetAuthority: {}
      }
      const res = { render: vi.fn() }

      prepareDatasetObjects(req, res, () => { })

      expect(req.datasets[0].error).toContain('504')
      expect(req.datasets[0].status).toBe('Error')
    })
    it('should show live if all endpoint status == 200', () => {
      const req = {
        expectationOutOfBounds: [],
        issues: {},
        endpoints: {
          datasetA: [{ latest_status: '200' },
            { latest_status: '200' },
            { latest_status: '200' }]
        },
        availableDatasets: ['datasetA'],
        datasets: undefined,
        datasetAuthority: {}
      }
      const res = { render: vi.fn() }

      prepareDatasetObjects(req, res, () => { })

      expect(req.datasets[0].error).toBeUndefined()
      expect(req.datasets[0].status).toBe('Live')
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
            { endpointCount: 1, status: 'Needs improving', dataset: 'dataset2' },
            { endpointCount: 1, status: 'Error', dataset: 'dataset3' }
          ]
        },
        totalDatasets: 3,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 1,
        isODPMember: false
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

  describe('prepareAuthorityBatch', () => {
    let req, res, next

    beforeEach(() => {
      req = {
        orgInfo: { entity: '123' },
        availableDatasets: ['dataset1', 'dataset2']
      }
      res = {}
      next = vi.fn()
      vi.clearAllMocks()
    })

    it('should populate req.datasetAuthority with authoritative status', async () => {
      platformApi.fetchEntities.mockImplementation(async ({ quality }) => {
        if (quality === 'authoritative') {
          return { formattedData: [{ id: 1 }] }
        }
        return { formattedData: [] }
      })

      await prepareAuthorityBatch(req, res, next)

      expect(req.datasetAuthority).toEqual({
        dataset1: 'authoritative',
        dataset2: 'authoritative'
      })
      expect(next).toHaveBeenCalled()
    })

    it('should populate req.datasetAuthority with some status if authoritative is missing', async () => {
      platformApi.fetchEntities.mockImplementation(async ({ quality }) => {
        if (quality === 'some') {
          return { formattedData: [{ id: 1 }] }
        }
        return { formattedData: [] }
      })

      await prepareAuthorityBatch(req, res, next)

      expect(req.datasetAuthority).toEqual({
        dataset1: 'some',
        dataset2: 'some'
      })
      expect(next).toHaveBeenCalled()
    })

    it('should populate req.datasetAuthority with empty string if no data found', async () => {
      platformApi.fetchEntities.mockResolvedValue({ formattedData: [] })

      await prepareAuthorityBatch(req, res, next)

      expect(req.datasetAuthority).toEqual({
        dataset1: '',
        dataset2: ''
      })
      expect(next).toHaveBeenCalled()
    })

    it('should handle errors gracefully and continue', async () => {
      platformApi.fetchEntities.mockRejectedValue(new Error('API Error'))

      await prepareAuthorityBatch(req, res, next)

      expect(req.datasetAuthority).toEqual({
        dataset1: '',
        dataset2: ''
      })
      expect(next).toHaveBeenCalled()
    })

    it('should skip processing if no available datasets', async () => {
      req.availableDatasets = []
      await prepareAuthorityBatch(req, res, next)
      expect(platformApi.fetchEntities).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })
  })
})
