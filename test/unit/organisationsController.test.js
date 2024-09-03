import { describe, it, vi, expect, beforeEach } from 'vitest'
import * as v from 'valibot'
import organisationsController from '../../src/controllers/OrganisationsController.js'
import performanceDbApi from '../../src/services/performanceDbApi.js'
import datasette from '../../src/services/datasette.js'

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
      await organisationsController.getOverview(req, res, next)

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

      vi.mocked(datasette.runQuery).mockResolvedValue({ formattedData: [] })

      await organisationsController.getOrganisations(req, res, next)

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

      vi.mocked(datasette.runQuery).mockResolvedValue({ formattedData: datasetteResponse })

      await organisationsController.getOrganisations(req, res, next)

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

    it('should catch errors and pass them onto the next function', async () => {
      const req = {}
      const res = {}
      const next = vi.fn()

      const error = new Error('Test error')

      vi.mocked(datasette.runQuery).mockRejectedValue(error)

      await organisationsController.getOrganisations(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('get-started', () => {
    const exampleLpa = {
      formattedData: [
        { name: 'Example LPA', organisation: 'LPA' }
      ]
    }
    const exampleDataset = {
      formattedData: [
        { name: 'Example Dataset' }
      ]
    }

    it('should render the get-started template with the correct params', async () => {
      const req = {
        params: { lpa: 'example-lpa', dataset: 'example-dataset' },
        orgInfo: exampleLpa.formattedData[0],
        dataset: exampleDataset.formattedData[0]
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      datasette.runQuery.mockImplementation((query) => {
        if (query.includes('example-lpa')) {
          return exampleLpa
        } else if (query.includes('example-dataset')) {
          return exampleDataset
        }
      })

      await organisationsController.getGetStarted(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/get-started.html', {
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        dataset: { name: 'Example Dataset' }
      })
    })

    it('should catch and pass errors to the next function', async () => {
      const req = {
        params: { lpa: 'example-lpa', dataset: 'example-dataset' },
        orgInfo: undefined, // this should fail validation
        dataset: exampleDataset.formattedData[0]
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      await organisationsController.getGetStarted(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('dataset task list', () => {
    it('should call render with the datasetTaskList page', async () => {
      const req = { params: { lpa: 'example-lpa', dataset: 'example-dataset' } }
      const res = { render: vi.fn() }
      const next = vi.fn()

      vi.mocked(datasette.runQuery).mockResolvedValueOnce({
        formattedData: [{ name: 'Example Organisation', organisation: 'ORG' }]
      }).mockResolvedValueOnce({
        formattedData: [{ name: 'Example Dataset' }]
      })

      vi.mocked(performanceDbApi.getLpaDatasetIssues).mockResolvedValue([
        {
          issue: 'Example issue 1',
          issue_type: 'Example issue type 1',
          num_issues: 1,
          status: 'Error'
        }
      ])

      vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce('task message 1')

      await organisationsController.getDatasetTaskList(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/datasetTaskList.html', {
        taskList: [{
          title: {
            text: 'task message 1'
          },
          href: '/organisations/example-lpa/example-dataset/Example issue type 1',
          status: {
            tag: {
              classes: 'govuk-tag--red',
              text: 'Error'
            }
          }
        }],
        organisation: { name: 'Example Organisation', organisation: 'ORG' },
        dataset: { name: 'Example Dataset' }
      })
    })

    it('should fetch the dataset tasks and correctly pass them on to the dataset task list page', async () => {
      const req = { params: { lpa: 'example-lpa', dataset: 'example-dataset' } }
      const res = { render: vi.fn() }
      const next = vi.fn()

      vi.mocked(datasette.runQuery).mockResolvedValueOnce({
        formattedData: [{ name: 'Example Organisation', organisation: 'ORG' }]
      }).mockResolvedValueOnce({
        formattedData: [{ name: 'Example Dataset' }]
      })

      vi.mocked(performanceDbApi.getLpaDatasetIssues).mockResolvedValue([
        {
          issue: 'Example issue 1',
          issue_type: 'Example issue type 1',
          num_issues: 1,
          status: 'Error'
        },
        {
          issue: 'Example issue 2',
          issue_type: 'Example issue type 2',
          num_issues: 1,
          status: 'Needs fixing'
        }
      ])

      vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce('task message 1').mockReturnValueOnce('task message 2')

      await organisationsController.getDatasetTaskList(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/datasetTaskList.html', {
        taskList: [
          {
            title: {
              text: 'task message 1'
            },
            href: '/organisations/example-lpa/example-dataset/Example issue type 1',
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
            href: '/organisations/example-lpa/example-dataset/Example issue type 2',
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

    it('should catch errors and pass them on to the next function', async () => {
      const req = { params: { lpa: 'example-lpa', dataset: 'example-dataset' } }
      const res = {}
      const next = vi.fn()

      // Mock the datasette.runQuery method to throw an error
      datasette.runQuery.mockImplementation(() => {
        throw new Error('example error')
      })

      await organisationsController.getDatasetTaskList(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(expect.any(Error))
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
        resourceId: 'test-resource-id',
        entityNumber: '1'
      }
      const req = {
        params: requestParams,
        // middleware supplies the below
        entityNumber: '1',
        issueEntitiesCount: 1,
        orgInfo,
        dataset,
        entryData,
        issues,
        resourceId: requestParams.resourceId
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

      await organisationsController.getIssueDetails(req, res, next)

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
        errorHeading: 'mock task message 1',
        issueItems: [
          {
            html: 'mockMessageFor: 0 in record 0',
            href: '/organisations/test-lpa/test-dataset/test-issue-type/0'
          }
        ],
        entry: {
          title: 'entry: 1',
          fields: [
            {
              key: { text: 'start-date' },
              value: { html: '02-02-2022' },
              classes: ''
            }
          ]
        },
        issueType: 'test-issue-type',
        pagination: {
          items: [{
            current: false,
            href: '/organisations/test-lpa/test-dataset/test-issue-type/1',
            number: 1,
            type: 'item'
          }]
        },
        issueEntitiesCount: 1
      })
    })

    it('should catch errors and pass them onto the next function', async () => {
      const req = {
        params: {
          lpa: 'test-lpa',
          dataset: 'test-dataset',
          issue_type: 'test-issue-type',
          resourceId: 'test-resource-id',
          entityNumber: '1'
        }
      }
      const res = {
        render: vi.fn()
      }
      const next = vi.fn()

      vi.mocked(performanceDbApi.getLatestResource).mockRejectedValue(new Error('Test error'))

      await organisationsController.getIssueDetails(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('getEndpointError', () => {
    it('should render http-error.html template with correct params', async () => {
      const req = { params: { lpa: 'example-lpa', dataset: 'example-dataset' } }
      const res = { render: vi.fn() }
      const next = vi.fn()
      const resourceStatus = { status: '404', days_since_200: 3, endpoint_url: 'https://example.com', latest_log_entry_date: '2022-01-01T12:00:00.000Z' }

      vi.mocked(datasette.runQuery).mockResolvedValueOnce({ formattedData: [{ name: 'Example Organisation', organisation: 'ORG' }] })
      vi.mocked(datasette.runQuery).mockResolvedValueOnce({ formattedData: [{ name: 'Example Dataset' }] })

      await organisationsController.getEndpointError(req, res, next, { resourceStatus })

      const dataTimeRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z/

      expect(res.render).toHaveBeenCalledTimes(1)
      const renderArgs = res.render.mock.calls[0]
      expect(renderArgs[0]).toEqual('organisations/http-error.html')
      expect(renderArgs[1].organisation).toEqual({ name: 'Example Organisation', organisation: 'ORG' })
      expect(renderArgs[1].dataset).toEqual({ name: 'Example Dataset' })
      expect(renderArgs[1].errorData.endpoint_url).toEqual('https://example.com')
      expect(renderArgs[1].errorData.http_status).toEqual('404')
      expect(renderArgs[1].errorData.latest_log_entry_date).toMatch(dataTimeRegex)
      expect(renderArgs[1].errorData.latest_200_date).toMatch(dataTimeRegex)
    })

    it('should catch errors and pass them to the next function', async () => {
      const req = { params: { lpa: 'example-lpa', dataset: 'example-dataset' } }
      const res = {}
      const next = vi.fn()
      const resourceStatus = { status: '404' }

      vi.mocked(datasette.runQuery).mockRejectedValueOnce(new Error('example error'))

      await organisationsController.getEndpointError(req, res, next, { resourceStatus })

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('conditionalTaskListHandler', () => {
    it('should call getEndpointError if resource status is not 200', async () => {
      const getResourceStatusSpy = vi.spyOn(organisationsController, 'getEndpointError')
      getResourceStatusSpy.mockResolvedValue({})

      const req = { params: { lpa: 'example-lpa', dataset: 'example-dataset' } }
      const res = { render: vi.fn() }
      const next = vi.fn()

      vi.mocked(performanceDbApi.getResourceStatus).mockResolvedValueOnce({ status: '404' })

      await organisationsController.conditionalTaskListHandler(req, res, next)

      expect(organisationsController.getEndpointError).toHaveBeenCalledTimes(1)
      expect(organisationsController.getEndpointError).toHaveBeenCalledWith(req, res, next, { resourceStatus: { status: '404' } })
    })

    it('should call getDatasetTaskList if resource status is 200', async () => {
      const getDatasetTaskListSpy = vi.spyOn(organisationsController, 'getDatasetTaskList')
      getDatasetTaskListSpy.mockResolvedValue({})

      const req = { params: { lpa: 'example-lpa', dataset: 'example-dataset' } }
      const res = { render: vi.fn() }
      const next = vi.fn()

      vi.mocked(performanceDbApi.getResourceStatus).mockResolvedValueOnce({ status: '200' })

      await organisationsController.conditionalTaskListHandler(req, res, next)

      expect(organisationsController.getDatasetTaskList).toHaveBeenCalledTimes(1)
      expect(organisationsController.getDatasetTaskList).toHaveBeenCalledWith(req, res, next)
    })

    it('should catch errors and pass them to the next function', async () => {
      const req = { params: { lpa: 'example-lpa', dataset: 'example-dataset' } }
      const res = {}
      const next = vi.fn()

      vi.mocked(performanceDbApi.getResourceStatus).mockRejectedValueOnce(new Error('example error'))

      await organisationsController.conditionalTaskListHandler(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
