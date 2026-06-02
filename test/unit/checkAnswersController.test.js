import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addInternalNoteToIssue, createCustomerRequest, attachFileToIssue } from '../../src/services/jiraService.js'
import config from '../../config/index.js'
import CheckAnswersController from '../../src/controllers/CheckAnswersController.js'
import { getRequestData } from '../../src/services/asyncRequestApi.js'

vi.mock('../../src/services/jiraService.js')
vi.mock('../../src/services/asyncRequestApi.js')

describe('CheckAnswersController', () => {
  let req, res, next, controller

  const sessionData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    orgId: 'test-org',
    lpa: 'Test Organisation',
    dataset: 'Test Dataset',
    'documentation-url': 'http://example.com/doc',
    'endpoint-url': 'http://example.com/endpoint',
    requestId: 'existing-request-id'
  }

  beforeEach(() => {
    req = {
      params: {},
      sessionModel: {
        get: vi.fn(),
        set: vi.fn()
      },
      form: { options: {} },
      body: {}
    }
    res = { redirect: vi.fn() }
    next = vi.fn()
    controller = new CheckAnswersController({ route: '/check-answers/:requestId' })
    vi.clearAllMocks()
    addInternalNoteToIssue.mockResolvedValue({ data: {} })
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
    it('should create a Jira service request using the existing requestId and attach a file', async () => {
      config.jira.requestTypeId = '1'
      req.sessionModel.get.mockImplementation((key) => sessionData[key])

      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      attachFileToIssue.mockResolvedValue({ data: {} })
      const attachSpy = vi.spyOn(controller, 'attachFileToIssue').mockResolvedValue()

      const result = await controller.createJiraServiceRequest(req, res, next)

      expect(createCustomerRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining(`${config.url}check/results/existing-request-id/1`)
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
      expect(attachSpy).toHaveBeenCalledWith(
        'existing-request-id',
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
      req.sessionModel.get.mockImplementation((key) => sessionData[key])
      createCustomerRequest.mockResolvedValue({ error: 'Error' })

      const result = await controller.createJiraServiceRequest(req, res, next)

      expect(result).toBeNull()
    })

    it('should return null if file attachment fails', async () => {
      req.sessionModel.get.mockImplementation((key) => sessionData[key])
      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      vi.spyOn(controller, 'attachFileToIssue').mockRejectedValue(new Error('Attachment failed'))

      const result = await controller.createJiraServiceRequest(req, res, next)

      expect(result).toEqual(response.data)
    })

    it('should add geometry type for dataset tree', async () => {
      config.jira.requestTypeId = '1'
      req.sessionModel.get.mockImplementation((key) => ({ ...sessionData, dataset: 'tree', geomType: 'polygon' })[key])
      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      attachFileToIssue.mockResolvedValue({ data: {} })
      vi.spyOn(controller, 'attachFileToIssue').mockResolvedValue()

      const result = await controller.createJiraServiceRequest(req, res, next)

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
      const mockRequestData = { getPlugin: vi.fn().mockReturnValue('wfs'), isComplete: vi.fn().mockReturnValue(true) }
      getRequestData.mockResolvedValue(mockRequestData)
      req.sessionModel.get.mockImplementation((key) => sessionData[key])

      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      attachFileToIssue.mockResolvedValue({ data: {} })

      const result = await controller.createJiraServiceRequest(req, res, next)

      expect(getRequestData).toHaveBeenCalledWith('existing-request-id')
      expect(attachFileToIssue).toHaveBeenCalledWith('TEST-123', expect.any(File), expect.any(String))

      const csvFile = attachFileToIssue.mock.calls[0][1]
      const csvContent = await csvFile.text()
      expect(csvContent).toContain('wfs')
      expect(csvContent).toContain('plugin')
      expect(result).toEqual(response.data)
    })

    it('should not include geometry type when dataset is not tree', async () => {
      config.jira.requestTypeId = '1'
      req.sessionModel.get.mockImplementation((key) => ({ ...sessionData, dataset: 'conservation-area', geomType: 'polygon' })[key])
      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      attachFileToIssue.mockResolvedValue({ data: {} })

      const result = await controller.createJiraServiceRequest(req, res, next)

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
