import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCustomerRequest, attachFileToIssue } from '../../src/services/jiraService.js'
import config from '../../config/index.js'
import CheckAnswersController from '../../src/controllers/CheckAnswersController.js'
import { postUrlRequest, getRequestData } from '../../src/services/asyncRequestApi.js'
import SubmitUrlController from '../../src/controllers/submitUrlController.js'

vi.mock('../../src/services/jiraService.js')
vi.mock('../../src/services/asyncRequestApi.js')
vi.mock('../../src/controllers/submitUrlController.js')

describe('CheckAnswersController', () => {
  let req, res, next, controller

  beforeEach(() => {
    req = {
      sessionModel: {
        get: vi.fn(),
        set: vi.fn()
      },
      body: {}
    }
    res = {
      redirect: vi.fn()
    }
    next = vi.fn()
    controller = new CheckAnswersController({
      route: '/dataset'
    })
    postUrlRequest.mockReset()
    SubmitUrlController.localUrlValidation.mockReset()
    vi.clearAllMocks()
  })

  describe('POST to CheckAnswersController', () => {
    it('should create a Jira issue and set session data on success', async () => {
      const issue = { issueKey: 'TEST-123' }
      vi.spyOn(controller, 'createJiraServiceRequest').mockResolvedValue(issue)
      await controller.post(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith('reference', issue.issueKey)
      expect(req.sessionModel.set).toHaveBeenCalledWith('errors', [])
      expect(res.redirect).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('should set session errors and redirect on failure to create Jira issue', async () => {
      vi.spyOn(controller, 'createJiraServiceRequest').mockResolvedValue(null)

      await controller.post(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith('errors', [{ text: 'An unexpected error occurred while processing your request.' }])
      expect(res.redirect).toHaveBeenCalledWith('/submit/check-answers')
      expect(next).not.toHaveBeenCalled()
    })

    it('should set session errors and redirect on unexpected error', async () => {
      vi.spyOn(controller, 'createJiraServiceRequest').mockRejectedValue(new Error('Unexpected error'))

      await controller.post(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith('errors', [{ text: 'An unexpected error occurred while processing your request.' }])
      expect(res.redirect).toHaveBeenCalledWith('/submit/check-answers')
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('createJiraServiceRequest', () => {
    it('should create a Jira service request and attach a file', async () => {
      config.jira.requestTypeId = '1'
      postUrlRequest.mockResolvedValue('requestId')
      const attachSpy = vi.spyOn(controller, 'attachFileToIssue').mockResolvedValue()
      req.sessionModel.get.mockImplementation((key) => {
        const data = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          orgId: 'test-org',
          lpa: 'Test Organisation',
          dataset: 'Test Dataset',
          'documentation-url': 'http://example.com/doc',
          'endpoint-url': 'http://example.com/endpoint'
        }
        return data[key]
      })

      const response = { data: { issueKey: 'TEST-123' } }

      createCustomerRequest.mockResolvedValue(response)
      attachFileToIssue.mockResolvedValue({ data: {} })

      const result = await controller.createJiraServiceRequest(req, res, next)
      expect(postUrlRequest).toHaveBeenCalled()

      expect(createCustomerRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining(`${config.url}check/results/requestId/1`)
        }),
        config.jira.requestTypeId
      )

      expect(createCustomerRequest).toHaveBeenCalledWith(
        {
          summary: 'Dataset URL request: Test Organisation for Test Dataset',
          description: expect.stringContaining('A new dataset request has been made by *John Doe* from *Test Organisation (test-org)* for the dataset *Test Dataset*.'),
          raiseOnBehalfOf: 'john.doe@example.com'
        },
        config.jira.requestTypeId
      )

      // Attachment happens asynchronously in the background; verify we trigger it.
      expect(attachSpy).toHaveBeenCalledWith(
        'requestId',
        expect.objectContaining({
          name: 'John Doe',
          email: 'john.doe@example.com',
          organisationId: 'test-org',
          organisationName: 'Test Organisation',
          dataset: 'Test Dataset',
          documentationUrl: 'http://example.com/doc',
          endpoint: 'http://example.com/endpoint'
        }),
        expect.any(String),
        response
      )
      expect(result).toEqual(response.data)
    })

    it('should return null if Jira service request creation fails', async () => {
      req.sessionModel.get.mockImplementation((key) => {
        const data = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          orgId: 'test-org',
          lpa: 'Test Organisation',
          dataset: 'Test Dataset',
          'documentation-url': 'http://example.com/doc',
          'endpoint-url': 'http://example.com/endpoint'
        }
        return data[key]
      })
      SubmitUrlController.localUrlValidation.mockResolvedValue(null)
      postUrlRequest.mockResolvedValue('requestId')
      createCustomerRequest.mockResolvedValue({ error: 'Error' })

      const result = await controller.createJiraServiceRequest(req, res, next)

      expect(result).toBeNull()
    })

    it('should return null if file attachment fails', async () => {
      req.sessionModel.get.mockImplementation((key) => {
        const data = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          orgId: 'test-org',
          lpa: 'Test Organisation',
          dataset: 'Test Dataset',
          'documentation-url': 'http://example.com/doc',
          'endpoint-url': 'http://example.com/endpoint'
        }
        return data[key]
      })

      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      vi.spyOn(controller, 'attachFileToIssue').mockRejectedValue(new Error('Attachment failed'))

      const result = await controller.createJiraServiceRequest(req, res, next)

      // Attachment failures are logged but do not fail the Jira request creation.
      expect(result).toEqual(response.data)
    })

    it('should add geomtry type for dataset is tree', async () => {
      config.jira.requestTypeId = '1'
      postUrlRequest.mockResolvedValue('requestId')
      req.sessionModel.get.mockImplementation((key) => {
        const data = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          orgId: 'test-org',
          lpa: 'Test Organisation',
          dataset: 'tree',
          'documentation-url': 'http://example.com/doc',
          'endpoint-url': 'http://example.com/endpoint',
          geomType: 'polygon'
        }
        return data[key]
      })
      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      attachFileToIssue.mockResolvedValue({ data: {} })

      const result = await controller.createJiraServiceRequest(req, res, next)
      expect(postUrlRequest).toHaveBeenCalled()

      expect(createCustomerRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Geometry Type: polygon')
        }),
        config.jira.requestTypeId
      )
      expect(result).toEqual(response.data)
    })

    it('should include plugin in CSV attachment when plugin is retrieved', async () => {
      config.jira.requestTypeId = '1'
      const mockRequestData = {
        getPlugin: vi.fn().mockReturnValue('wfs')
      }
      getRequestData.mockResolvedValue(mockRequestData)
      postUrlRequest.mockResolvedValue('requestId')

      req.sessionModel.get.mockImplementation((key) => {
        const data = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          orgId: 'test-org',
          lpa: 'Test Organisation',
          dataset: 'conservation-area',
          'documentation-url': 'http://example.com/doc',
          'endpoint-url': 'http://example.com/endpoint'
        }
        return data[key]
      })

      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      attachFileToIssue.mockResolvedValue({ data: {} })

      const result = await controller.createJiraServiceRequest(req, res, next)

      expect(getRequestData).toHaveBeenCalledWith('requestId')
      expect(mockRequestData.getPlugin).toHaveBeenCalled()
      expect(attachFileToIssue).toHaveBeenCalledWith(
        'TEST-123',
        expect.any(File),
        expect.any(String)
      )

      // Verify the CSV file contains the plugin value
      const attachFileCall = attachFileToIssue.mock.calls[0]
      const csvFile = attachFileCall[1]
      const csvContent = await csvFile.text()
      expect(csvContent).toContain('wfs')
      expect(csvContent).toContain('plugin')

      expect(result).toEqual(response.data)
    })

    it('should not include geometry type when dataset is not tree', async () => {
      config.jira.requestTypeId = '1'
      postUrlRequest.mockResolvedValue('requestId')
      req.sessionModel.get.mockImplementation((key) => {
        const data = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          orgId: 'test-org',
          lpa: 'Test Organisation',
          dataset: 'conservation-area',
          'documentation-url': 'http://example.com/doc',
          'endpoint-url': 'http://example.com/endpoint',
          geomType: 'polygon'
        }
        return data[key]
      })
      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      attachFileToIssue.mockResolvedValue({ data: {} })

      const result = await controller.createJiraServiceRequest(req, res, next)
      expect(postUrlRequest).toHaveBeenCalled()

      expect(createCustomerRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.not.stringContaining('Geometry Type: polygon')
        }),
        config.jira.requestTypeId
      )
      expect(result).toEqual(response.data)
    })
  })
})
