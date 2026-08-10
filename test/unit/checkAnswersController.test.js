import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addInternalNoteToIssue, createCustomerRequest, attachFileToIssue } from '../../src/services/jiraService.js'
import config from '../../config/index.js'
import CheckAnswersController from '../../src/controllers/CheckAnswersController.js'
import { getRequestData } from '../../src/services/asyncRequestApi.js'
import { reserveSubmittedEndpoint, renewSubmittedEndpoint, settleSubmittedEndpoint } from '../../src/utils/redisLoader.js'

vi.mock('../../src/services/jiraService.js')
vi.mock('../../src/services/asyncRequestApi.js')
vi.mock('../../src/utils/redisLoader.js')

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
    res = { redirect: vi.fn(), json: vi.fn() }
    next = vi.fn()
    controller = new CheckAnswersController({ route: '/check-answers/:requestId' })
    vi.clearAllMocks()
    reserveSubmittedEndpoint.mockResolvedValue('reservation-token')
    renewSubmittedEndpoint.mockResolvedValue(true)
    settleSubmittedEndpoint.mockResolvedValue()
    addInternalNoteToIssue.mockResolvedValue({ data: {} })
  })

  describe('locals', () => {
    it('should redirect to /check/url when dataset is missing', async () => {
      req.sessionModel.get.mockImplementation(key => ({
        requestId: 'existing-request-id'
      }[key]))

      await controller.locals(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/check/url')
      expect(getRequestData).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('POST to CheckAnswersController', () => {
    it('should return the Manage Service link as JSON locally when Jira is not configured', async () => {
      const originalEnvironment = config.environment
      config.environment = 'local'
      vi.stubEnv('JIRA_URL', '')
      vi.stubEnv('JIRA_API_KEY', '')
      vi.stubEnv('JIRA_SERVICE_DESK_ID', '')
      req.sessionModel.get.mockImplementation((key) => sessionData[key])

      try {
        await controller.post(req, res, next)

        expect(createCustomerRequest).not.toHaveBeenCalled()
        expect(settleSubmittedEndpoint).toHaveBeenCalledWith({
          endpointUrl: sessionData['endpoint-url'],
          dataset: sessionData.dataset,
          organisation: sessionData.orgId
        }, 'reservation-token', 0)
        expect(res.json).toHaveBeenCalledWith({
          message: 'Jira is not configured for local development. Use this Manage Service link to add the data.',
          manageServiceLink: expect.stringContaining(`${config.manageServiceUrl}/datamanager`)
        })
        expect(res.json.mock.calls[0][0].manageServiceLink).toContain('requestId=existing-request-id')
        expect(res.json.mock.calls[0][0].manageServiceLink).toContain('documentationUrl=http%3A%2F%2Fexample.com%2Fdoc')
        expect(next).not.toHaveBeenCalled()
      } finally {
        config.environment = originalEnvironment
        vi.unstubAllEnvs()
      }
    })

    it('should create a Jira issue and set session data on success', async () => {
      const issue = { issueKey: 'TEST-123' }
      req.sessionModel.get.mockImplementation((key) => sessionData[key])
      vi.spyOn(controller, 'createJiraServiceRequest').mockResolvedValue(issue)
      await controller.post(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith('reference', issue.issueKey)
      expect(req.sessionModel.set).toHaveBeenCalledWith('errors', [])
      expect(reserveSubmittedEndpoint).toHaveBeenCalledWith({
        endpointUrl: sessionData['endpoint-url'],
        dataset: sessionData.dataset,
        organisation: sessionData.orgId
      })
      expect(settleSubmittedEndpoint).toHaveBeenCalledWith({
        endpointUrl: sessionData['endpoint-url'],
        dataset: sessionData.dataset,
        organisation: sessionData.orgId
      }, 'reservation-token', 86400)
      expect(res.redirect).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('should set session errors and redirect on failure to create Jira issue', async () => {
      req.sessionModel.get.mockImplementation((key) => sessionData[key])
      vi.spyOn(controller, 'createJiraServiceRequest').mockResolvedValue(null)

      await controller.post(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith('errors', [{ text: 'An unexpected error occurred while processing your request.' }])
      expect(settleSubmittedEndpoint).toHaveBeenCalledWith({
        endpointUrl: sessionData['endpoint-url'],
        dataset: sessionData.dataset,
        organisation: sessionData.orgId
      }, 'reservation-token', 0)
      expect(res.redirect).toHaveBeenCalledWith('/submit/check-answers')
      expect(next).not.toHaveBeenCalled()
    })

    it('should set session errors and redirect on unexpected error', async () => {
      req.sessionModel.get.mockImplementation((key) => sessionData[key])
      vi.spyOn(controller, 'createJiraServiceRequest').mockRejectedValue(new Error('Unexpected error'))

      await controller.post(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith('errors', [{ text: 'An unexpected error occurred while processing your request.' }])
      expect(settleSubmittedEndpoint).toHaveBeenCalledWith({
        endpointUrl: sessionData['endpoint-url'],
        dataset: sessionData.dataset,
        organisation: sessionData.orgId
      }, 'reservation-token', 0)
      expect(res.redirect).toHaveBeenCalledWith('/submit/check-answers')
      expect(next).not.toHaveBeenCalled()
    })

    it('should not create another Jira issue when the endpoint is already reserved', async () => {
      req.sessionModel.get.mockImplementation((key) => sessionData[key])
      reserveSubmittedEndpoint.mockResolvedValue(false)
      const createJiraSpy = vi.spyOn(controller, 'createJiraServiceRequest')

      await controller.post(req, res, next)

      expect(createJiraSpy).not.toHaveBeenCalled()
      expect(req.sessionModel.set).not.toHaveBeenCalled()
      expect(res.redirect).toHaveBeenCalledWith('/check/confirmation')
      expect(next).not.toHaveBeenCalled()
    })

    it('should renew the reservation during long-running Jira creation', async () => {
      vi.useFakeTimers()
      req.sessionModel.get.mockImplementation((key) => sessionData[key])
      const issue = { issueKey: 'TEST-123' }

      // Mock Jira creation to take 130 seconds (longer than the 120-second reservation TTL)
      const createJiraSpy = vi.spyOn(controller, 'createJiraServiceRequest').mockImplementation(async () => {
        await vi.advanceTimersByTimeAsync(130 * 1000)
        return issue
      })

      const postPromise = controller.post(req, res, next)
      await vi.runAllTimersAsync()
      await postPromise

      // Verify that renewal was called (should be called at least twice: at 60s and 120s)
      expect(renewSubmittedEndpoint).toHaveBeenCalled()
      expect(renewSubmittedEndpoint).toHaveBeenCalledWith({
        endpointUrl: sessionData['endpoint-url'],
        dataset: sessionData.dataset,
        organisation: sessionData.orgId
      }, 'reservation-token', 120)

      // Verify successful submission
      expect(createJiraSpy).toHaveBeenCalled()
      expect(req.sessionModel.set).toHaveBeenCalledWith('reference', issue.issueKey)
      expect(settleSubmittedEndpoint).toHaveBeenCalledWith({
        endpointUrl: sessionData['endpoint-url'],
        dataset: sessionData.dataset,
        organisation: sessionData.orgId
      }, 'reservation-token', 86400)

      vi.useRealTimers()
    })

    it('should block duplicate requests during long Jira creation when renewal keeps the reservation active', async () => {
      vi.useFakeTimers()
      req.sessionModel.get.mockImplementation((key) => sessionData[key])
      const issue = { issueKey: 'TEST-123' }

      // First request: simulate long Jira creation (150 seconds)
      const createJiraSpy = vi.spyOn(controller, 'createJiraServiceRequest').mockImplementation(async () => {
        await vi.advanceTimersByTimeAsync(150 * 1000)
        return issue
      })

      // Start first request
      const postPromise = controller.post(req, res, next)

      // Advance time to 130 seconds (past the original 120s TTL, but renewal should have extended it)
      await vi.advanceTimersByTimeAsync(130 * 1000)

      // Verify renewals have happened
      expect(renewSubmittedEndpoint).toHaveBeenCalled()

      // Simulate a second concurrent request arriving after 130 seconds
      const req2 = {
        params: {},
        sessionModel: {
          get: vi.fn().mockImplementation((key) => sessionData[key]),
          set: vi.fn()
        },
        form: { options: {} },
        body: {}
      }
      const res2 = { redirect: vi.fn(), json: vi.fn() }
      const next2 = vi.fn()

      // Second request should be rejected because the reservation is still held (renewed)
      reserveSubmittedEndpoint.mockResolvedValueOnce(false)
      const controller2 = new CheckAnswersController({ route: '/check-answers/:requestId' })
      await controller2.post(req2, res2, next2)

      expect(res2.redirect).toHaveBeenCalledWith('/check/confirmation')
      expect(next2).not.toHaveBeenCalled()

      // Complete first request
      await vi.runAllTimersAsync()
      await postPromise

      expect(createJiraSpy).toHaveBeenCalledTimes(1)
      expect(req.sessionModel.set).toHaveBeenCalledWith('reference', issue.issueKey)

      vi.useRealTimers()
    })

    it('should clear renewal interval on error', async () => {
      vi.useFakeTimers()
      req.sessionModel.get.mockImplementation((key) => sessionData[key])

      // Mock Jira creation to fail after some time
      vi.spyOn(controller, 'createJiraServiceRequest').mockImplementation(async () => {
        await vi.advanceTimersByTimeAsync(70 * 1000)
        throw new Error('Jira creation failed')
      })

      const postPromise = controller.post(req, res, next)
      await vi.runAllTimersAsync()
      await postPromise

      // Verify renewal was called at least once
      expect(renewSubmittedEndpoint).toHaveBeenCalled()

      // Verify reservation was released on error
      expect(settleSubmittedEndpoint).toHaveBeenCalledWith({
        endpointUrl: sessionData['endpoint-url'],
        dataset: sessionData.dataset,
        organisation: sessionData.orgId
      }, 'reservation-token', 0)

      expect(req.sessionModel.set).toHaveBeenCalledWith('errors', [{ text: 'An unexpected error occurred while processing your request.' }])
      expect(res.redirect).toHaveBeenCalledWith('/submit/check-answers')

      vi.useRealTimers()
    })
  })

  describe('createJiraServiceRequest', () => {
    it('should create a Jira service request using the existing requestId and attach a file', async () => {
      config.jira.requestTypeId = '28'
      req.sessionModel.get.mockImplementation((key) => sessionData[key])

      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      attachFileToIssue.mockResolvedValue({ data: {} })
      const attachSpy = vi.spyOn(controller, 'attachFileToIssue').mockResolvedValue()

      const result = await controller.createJiraServiceRequest(req, res, next)

      const [jiraRequest, jiraRequestTypeId] = createCustomerRequest.mock.calls[0]
      expect(jiraRequest.description).toContain(`${config.url}check/results/existing-request-id/1`)
      expect(jiraRequest.description).not.toContain(`${config.url}check/results/existing-request-id/${config.jira.requestTypeId}`)
      expect(jiraRequest.description).toContain(`LPA Dashboard: ${config.url}organisations/${sessionData.orgId}`)
      expect(jiraRequestTypeId).toBe(config.jira.requestTypeId)
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
      config.jira.requestTypeId = '28'
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
      config.jira.requestTypeId = '28'
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
      config.jira.requestTypeId = '28'
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
