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

  describe('get-started', () => {
    const exampleLpa = {
      formattedData: [
        { name: 'Example LPA', organisation: 'LPA' }
      ]
    }
    const exampleDataset = { name: 'Example Dataset', dataset: 'example-dataset' }

    it('should render the get-started template with the correct params', async () => {
      const req = {
        params: { lpa: 'example-lpa', dataset: 'example-dataset' },
        orgInfo: exampleLpa.formattedData[0],
        dataset: exampleDataset
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      organisationsController.getGetStarted(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/get-started.html', {
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        dataset: exampleDataset
      })
    })

    it('should catch and pass errors to the next function', async () => {
      const req = {
        params: { lpa: 'example-lpa', dataset: 'example-dataset' },
        orgInfo: undefined, // this should fail validation
        dataset: exampleDataset
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      organisationsController.getGetStarted(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledTimes(0)
    })
  })

  describe('dataset task list', () => {
    it('should fetch the dataset tasks and correctly pass them on to the dataset task list page', async () => {
      const req = {
        params: { lpa: 'example-lpa', dataset: 'example-dataset' },
        resourceStatus: {
          resource: 'mock-resource',
          endpoint_url: 'http://example.com/resource',
          status: '200',
          latest_log_entry_date: '',
          days_since_200: 0
        },
        orgInfo: { name: 'Example Organisation', organisation: 'ORG' },
        dataset: { name: 'Example Dataset' },
        resource: { resource: 'mock-resource' },
        issues: [
          {
            issue: 'Example issue 1',
            issue_type: 'Example issue type 1',
            field: 'Example issue field 1',
            num_issues: 1,
            status: 'Error'
          },
          {
            issue: 'Example issue 2',
            issue_type: 'Example issue type 2',
            field: 'Example issue field 2',
            num_issues: 1,
            status: 'Needs fixing'
          }
        ]
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce('task message 1').mockReturnValueOnce('task message 2')

      organisationsController.prepareDatasetTaskListTemplateParams(req, res, next)
      organisationsController.getDatasetTaskList(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/datasetTaskList.html', {
        taskList: [
          {
            title: {
              text: 'task message 1'
            },
            href: '/organisations/example-lpa/example-dataset/Example issue type 1/Example issue field 1',
            status: {
              tag: {
                classes: 'govuk-tag--red',
                text: 'Error'
              }
            }
          },
          {
            title: {
              text: 'task message 2'
            },
            href: '/organisations/example-lpa/example-dataset/Example issue type 2/Example issue field 2',
            status: {
              tag: {
                classes: 'govuk-tag--yellow',
                text: 'Needs fixing'
              }
            }
          }
        ],
        organisation: { name: 'Example Organisation', organisation: 'ORG' },
        dataset: { name: 'Example Dataset' }
      })
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
        resourceId: requestParams.resourceId,
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
        resourceId: requestParams.resourceId,
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

  describe('getDatasetTaskListError', () => {
    it('should render http-error.html template with correct params', async () => {
      const resourceStatus = { status: '404', days_since_200: 3, endpoint_url: 'https://example.com', latest_log_entry_date: '2022-01-01T12:00:00.000Z' }
      const organisation = { name: 'Example Organisation', organisation: 'ORG' }
      const dataset = { name: 'Example Dataset', dataset: 'example-dataset' }
      const req = {
        params: { lpa: 'example-lpa', dataset: 'example-dataset' },
        resourceStatus,
        orgInfo: organisation,
        dataset
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      organisationsController.prepareDatasetTaskListErrorTemplateParams(req, res, next)
      organisationsController.getDatasetTaskListError(req, res, next)

      const dataTimeRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z/

      expect(res.render).toHaveBeenCalledTimes(1)
      const renderArgs = res.render.mock.calls[0]
      expect(renderArgs[0]).toEqual('organisations/http-error.html')
      expect(renderArgs[1].organisation).toEqual(organisation)
      expect(renderArgs[1].dataset).toEqual(dataset)
      expect(renderArgs[1].errorData.endpoint_url).toEqual('https://example.com')
      expect(renderArgs[1].errorData.http_status).toEqual('404')
      expect(renderArgs[1].errorData.latest_log_entry_date).toMatch(dataTimeRegex)
      expect(renderArgs[1].errorData.latest_200_date).toMatch(dataTimeRegex)
    })
  })
})
