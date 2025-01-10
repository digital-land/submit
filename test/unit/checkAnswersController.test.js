import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCustomerRequest, attachFileToIssue } from '../../src/services/jiraService.js'
import config from '../../config/index.js'
import CheckAnswersController from '../../src/controllers/CheckAnswersController.js'

vi.mock('../../src/services/jiraService.js')

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

      expect(req.sessionModel.set).toHaveBeenCalledWith('errors', [{ text: 'Failed to create Jira issue.' }])
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
      req.sessionModel.get.mockImplementation((key) => {
        const data = {
          name: 'John Doe',
          email: 'john.doe@example.com',
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

      expect(createCustomerRequest).toHaveBeenCalledWith(
        'Dataset URL request: Test Organisation for Test Dataset',
        expect.stringContaining('A new dataset request has been made by *John Doe* from *Test Organisation* for the dataset *Test Dataset*.'),
        config.jira.requestTypeId
      )
      expect(attachFileToIssue).toHaveBeenCalledWith(
        'TEST-123',
        expect.any(File)
      )
      expect(result).toEqual(response.data)
    })

    it('should return null if Jira service request creation fails', async () => {
      createCustomerRequest.mockResolvedValue({ error: 'Error' })

      const result = await controller.createJiraServiceRequest(req, res, next)

      expect(result).toBeNull()
    })

    it('should return null if file attachment fails', async () => {
      req.sessionModel.get.mockImplementation((key) => {
        const data = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          lpa: 'Test Organisation',
          dataset: 'Test Dataset',
          'documentation-url': 'http://example.com/doc',
          'endpoint-url': 'http://example.com/endpoint'
        }
        return data[key]
      })

      const response = { data: { issueKey: 'TEST-123' } }
      createCustomerRequest.mockResolvedValue(response)
      attachFileToIssue.mockResolvedValue({ error: 'Error' })

      const result = await controller.createJiraServiceRequest(req, res, next)

      expect(result).toBeNull()
    })
  })
})
