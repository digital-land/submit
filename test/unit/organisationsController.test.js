import { describe, it, vi, expect, beforeEach } from 'vitest'
import * as v from 'valibot'
import organisationsController from '../../src/controllers/OrganisationsController.js'
import performanceDbApi from '../../src/services/performanceDbApi.js'

vi.mock('../../src/services/performanceDbApi.js')
vi.mock('../../src/utils/utils.js', () => {
  return {
    dataSubjects: {}
  }
})

vi.mock('../../src/services/datasette.js', () => ({
  default: {
    runQuery: vi.fn()
  }
}))
vi.mock('../../src/utils/issueMessages/getDatasetTaskList.js')

describe('OrganisationsController.js', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('overview', () => {
    const exampleLpa = {
      formattedData: [
        { name: 'Example LPA', organisation: 'LPA' }
      ]
    }

    const perfDbApiResponse = {
      name: 'test LPA',
      datasets: {
        dataset1: { endpoint: 'https://example.com', status: 'Live' },
        dataset2: { endpoint: null, status: 'Needs fixing' },
        dataset3: { endpoint: 'https://example.com', status: 'Error' }
      }
    }

    it('should render the overview page', async () => {
      const req = {
        params: { lpa: 'LPA' },
        orgInfo: exampleLpa.formattedData[0],
        lpaOverview: perfDbApiResponse
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      organisationsController.prepareOverviewTemplateParams(req, res, () => {})
      organisationsController.getOverview(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/overview.html', expect.objectContaining({
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        datasets: expect.arrayContaining([
          { endpoint: 'https://example.com', status: 'Live', slug: 'dataset1' },
          { endpoint: null, status: 'Needs fixing', slug: 'dataset2' },
          { endpoint: 'https://example.com', status: 'Error', slug: 'dataset3' }
        ]),
        totalDatasets: 3,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 1
      }))
    })
  })

  describe('find', () => {
    it('should call render with the find page', async () => {
      const req = {}
      const res = { render: vi.fn() }
      const next = vi.fn()

      req.organisations = []
      organisationsController.prepareGetOrganisationsTemplateParams(req, res, next)
      organisationsController.getOrganisations(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/find.html', expect.objectContaining({
        alphabetisedOrgs: {}
      }))
    })

    it('should correctly sort and restructure the data recieved from datasette, then pass it on to the template', async () => {
      const req = {}
      const res = { render: vi.fn() }
      const next = vi.fn()

      const datasetteResponse = [
        { name: 'Aardvark Healthcare', organisation: 'Aardvark Healthcare' },
        { name: 'Bath NHS Trust', organisation: 'Bath NHS Trust' },
        { name: 'Bristol Hospital', organisation: 'Bristol Hospital' },
        { name: 'Cardiff Health Board', organisation: 'Cardiff Health Board' },
        { name: 'Derbyshire Healthcare', organisation: 'Derbyshire Healthcare' },
        { name: 'East Sussex NHS Trust', organisation: 'East Sussex NHS Trust' }
      ]

      req.organisations = datasetteResponse
      organisationsController.prepareGetOrganisationsTemplateParams(req, res, next)
      organisationsController.getOrganisations(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/find.html', expect.objectContaining({
        alphabetisedOrgs: {
          A: [
            { name: 'Aardvark Healthcare', organisation: 'Aardvark Healthcare' }
          ],
          B: [
            { name: 'Bath NHS Trust', organisation: 'Bath NHS Trust' },
            { name: 'Bristol Hospital', organisation: 'Bristol Hospital' }
          ],
          C: [
            { name: 'Cardiff Health Board', organisation: 'Cardiff Health Board' }
          ],
          D: [
            { name: 'Derbyshire Healthcare', organisation: 'Derbyshire Healthcare' }
          ],
          E: [
            { name: 'East Sussex NHS Trust', organisation: 'East Sussex NHS Trust' }
          ]
        }
      }))
    })
  })

  describe('issue details', () => {
    const orgInfo = { name: 'mock lpa', organisation: 'ORG' }
    const dataset = { name: 'mock dataset', dataset: 'mock-dataset' }
    const entryData = [
      {
        field: 'start-date',
        value: '02-02-2022',
        entry_number: 1
      }
    ]
    const issues = [
      {
        entry_number: 0,
        field: 'start-date',
        value: '02-02-2022'
      }
    ]

    it('should call render with the issue details page and the correct params', async () => {
      const requestParams = {
        lpa: 'test-lpa',
        dataset: 'test-dataset',
        issue_type: 'test-issue-type',
        issue_field: 'test-issue-field',
        resourceId: 'test-resource-id',
        entityNumber: '1'
      }
      const req = {
        params: requestParams,
        // middleware supplies the below
        entryNumber: 1,
        entityCount: { entity_count: 3 },
        issueEntitiesCount: 1,
        pageNumber: 1,
        orgInfo,
        dataset,
        entryData,
        issues,
        resource: { resource: requestParams.resourceId },
        issuesByEntryNumber: {
          1: [
            {
              field: 'start-date',
              value: '02-02-2022',
              line_number: 1,
              entry_number: 1,
              message: 'mock message',
              issue_type: 'mock type'
            }
          ]
        }
        // errorHeading -- set  in prepare* fn
      }
      v.parse(organisationsController.IssueDetailsQueryParams, req.params)

      const res = {
        render: vi.fn()
      }
      const next = vi.fn()

      issues.forEach(issue => {
        vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce(`mockMessageFor: ${issue.entry_number}`)
      })
      vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce('mock task message 1')

      organisationsController.prepareIssueDetailsTemplateParams(req, {}, () => {})
      organisationsController.getIssueDetails(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/issueDetails.html', {
        organisation: {
          name: 'mock lpa',
          organisation: 'ORG'
        },
        dataset: {
          name: 'mock dataset',
          dataset: 'mock-dataset'
        },
        errorHeading: 'mockMessageFor: 0',
        issueItems: [
          {
            html: 'mock task message 1 in record 1',
            href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/1'
          }
        ],
        entry: {
          title: 'entry: 1',
          fields: [
            {
              key: { text: 'start-date' },
              value: { html: '<p class="govuk-error-message">mock message</p>02-02-2022' },
              classes: 'dl-summary-card-list__row--error'
            }
          ],
          geometries: []
        },
        issueType: 'test-issue-type',
        pagination: {
          items: [{
            current: true,
            href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/1',
            number: 1,
            type: 'item'
          }]
        },
        issueEntitiesCount: 1,
        pageNumber: 1
      })
    })

    it('should call render with the issue details page with the correct geometry params', async () => {
      const entryData = [
        {
          field: 'start-date',
          value: '02-02-2022',
          entry_number: 1
        },
        {
          field: 'geometry',
          value: 'POINT(0 0)',
          entry_number: 1
        }
      ]
      const requestParams = {
        lpa: 'test-lpa',
        dataset: 'test-dataset',
        issue_type: 'test-issue-type',
        issue_field: 'test-issue-field',
        resourceId: 'test-resource-id',
        entityNumber: '1'
      }
      const req = {
        params: requestParams,
        // middleware supplies the below
        entryNumber: 1,
        entityCount: { entity_count: 3 },
        issueEntitiesCount: 1,
        pageNumber: 1,
        orgInfo,
        dataset,
        entryData,
        issues,
        resource: { resource: requestParams.resourceId },
        issuesByEntryNumber: {
          1: [
            {
              field: 'start-date',
              value: '02-02-2022',
              line_number: 1,
              entry_number: 1,
              message: 'mock message',
              issue_type: 'mock type'
            }
          ]
        }
        // errorHeading -- set  in prepare* fn
      }
      v.parse(organisationsController.IssueDetailsQueryParams, req.params)

      const res = {
        render: vi.fn()
      }
      const next = vi.fn()

      issues.forEach(issue => {
        vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce(`mockMessageFor: ${issue.entry_number}`)
      })
      vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce('mock task message 1')

      organisationsController.prepareIssueDetailsTemplateParams(req, {}, () => {})
      organisationsController.getIssueDetails(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/issueDetails.html', {
        organisation: {
          name: 'mock lpa',
          organisation: 'ORG'
        },
        dataset: {
          name: 'mock dataset',
          dataset: 'mock-dataset'
        },
        errorHeading: 'mockMessageFor: 0',
        issueItems: [
          {
            html: 'mock task message 1 in record 1',
            href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/1'
          }
        ],
        entry: {
          title: 'entry: 1',
          fields: [
            {
              key: { text: 'start-date' },
              value: { html: '<p class="govuk-error-message">mock message</p>02-02-2022' },
              classes: 'dl-summary-card-list__row--error'
            },
            {
              classes: '',
              key: {
                text: 'geometry'
              },
              value: {
                html: 'POINT(0 0)'
              }
            }
          ],
          geometries: ['POINT(0 0)']
        },
        issueType: 'test-issue-type',
        pagination: {
          items: [{
            current: true,
            href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/1',
            number: 1,
            type: 'item'
          }]
        },
        issueEntitiesCount: 1,
        pageNumber: 1
      })
    })
  })
})
