import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { attachFileToIssue, createCustomerRequest } from '../../../src/services/jiraService'

vi.mock('axios')

describe('jiraService', () => {
  describe('createCustomerRequest', () => {
    const summary = 'Test Summary'
    const description = 'Test Description'
    const requestTypeId = '123'
    const raiseOnBehalfOf = 'john.doe@example.com'

    beforeEach(() => {
      process.env.JIRA_URL = 'https://jira.example.com'
      process.env.JIRA_BASIC_AUTH = 'basicAuthToken'
      process.env.JIRA_SERVICE_DESK_ID = 'serviceDeskId'
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should throw an error if JIRA_URL, JIRA_BASIC_AUTH, or JIRA_SERVICE_DESK_ID are not set', async () => {
      delete process.env.JIRA_URL

      await expect(createCustomerRequest(summary, description, requestTypeId))
        .rejects
        .toThrowError('JIRA_URL, JIRA_BASIC_AUTH and JIRA_SERVICE_DESK_ID must be set')
    })

    it('should call axios.post with correct parameters', async () => {
      const mockResponse = {
        issueId: '10001',
        issueKey: 'SUP-1',
        summary: 'Test Summary',
        requestFieldValues: [
          {
            fieldId: 'summary',
            label: 'Summary',
            value: 'Test Summary'
          },
          {
            fieldId: 'description',
            label: 'Description',
            value: 'Test Description',
            renderedValue: {
              html: '<p>Test Description</p>'
            }
          },
          {
            fieldId: 'attachment',
            label: 'Attachment',
            value: []
          }
        ]
      }
      axios.post.mockResolvedValue(mockResponse)

      const response = await createCustomerRequest({ summary, description, raiseOnBehalfOf }, requestTypeId)

      expect(axios.post).toHaveBeenCalledWith(
        'https://jira.example.com/rest/servicedeskapi/request',
        JSON.stringify({
          requestFieldValues: {
            summary,
            description
          },
          serviceDeskId: 'serviceDeskId',
          requestTypeId,
          raiseOnBehalfOf
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic basicAuthToken'
          }
        }
      )
      expect(response).toBe(mockResponse)
    })

    it('should handle network errors gracefully', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Internal Server Error' }
        },
        message: 'Request failed with status code 500'
      })

      await expect(createCustomerRequest(summary, description, requestTypeId))
        .rejects
        .toThrowError('Request failed with status code 500')
    })
  })

  describe('attachFileToIssue', () => {
    const issueKey = 'SUP-1'
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const additionalComment = 'Test Comment'

    beforeEach(() => {
      process.env.JIRA_URL = 'https://jira.example.com'
      process.env.JIRA_BASIC_AUTH = 'basicAuthToken'
      process.env.JIRA_SERVICE_DESK_ID = 'serviceDeskId'
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should throw an error if JIRA_URL, JIRA_BASIC_AUTH, or JIRA_SERVICE_DESK_ID are not set', async () => {
      delete process.env.JIRA_URL

      await expect(attachFileToIssue(issueKey, file, additionalComment))
        .rejects
        .toThrowError('JIRA_URL, JIRA_BASIC_AUTH and JIRA_SERVICE_DESK_ID must be set')
    })

    it('should call axios.post with correct parameters', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const mockTemporaryResponse = {
        data: {
          temporaryAttachments: [
            {
              temporaryAttachmentId: 'temp123'
            }
          ]
        }
      }
      const mockAttachmentResponse = {
        data: {
          issueId: '10001',
          issueKey: 'SUP-1'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockTemporaryResponse) // First call for temporary file
        .mockResolvedValueOnce(mockAttachmentResponse) // Second call for attachment

      const response = await attachFileToIssue(issueKey, file, additionalComment)

      // Verify temporary file upload call
      expect(axios.post).toHaveBeenNthCalledWith(1,
        'https://jira.example.com/rest/servicedeskapi/servicedesk/serviceDeskId/attachTemporaryFile',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: 'Basic basicAuthToken',
            'X-ExperimentalApi': 'opt-in',
            'X-Atlassian-Token': 'no-check'
          }
        }
      )

      // Verify attachment call
      expect(axios.post).toHaveBeenNthCalledWith(2,
        'https://jira.example.com/rest/servicedeskapi/request/SUP-1/attachment',
        {
          temporaryAttachmentIds: ['temp123'],
          additionalComment: {
            body: 'Test Comment'
          },
          public: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic basicAuthToken'
          }
        }
      )

      expect(response).toBe(mockAttachmentResponse)
    })

    it('should call axios.post without additional comment if not provided', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const mockTemporaryResponse = {
        data: {
          temporaryAttachments: [
            {
              temporaryAttachmentId: 'temp123'
            }
          ]
        }
      }
      const mockAttachmentResponse = {
        data: {
          issueId: '10001',
          issueKey: 'SUP-1'
        }
      }

      axios.post
        .mockResolvedValueOnce(mockTemporaryResponse) // First call for temporary file
        .mockResolvedValueOnce(mockAttachmentResponse) // Second call for attachment

      const response = await attachFileToIssue(issueKey, file)

      // Verify temporary file upload call
      expect(axios.post).toHaveBeenNthCalledWith(1,
        'https://jira.example.com/rest/servicedeskapi/servicedesk/serviceDeskId/attachTemporaryFile',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: 'Basic basicAuthToken',
            'X-ExperimentalApi': 'opt-in',
            'X-Atlassian-Token': 'no-check'
          }
        }
      )

      // Verify attachment call
      expect(axios.post).toHaveBeenNthCalledWith(2,
        'https://jira.example.com/rest/servicedeskapi/request/SUP-1/attachment',
        {
          temporaryAttachmentIds: ['temp123'],
          additionalComment: {
            body: 'Please find the file attached.'
          },
          public: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic basicAuthToken'
          }
        }
      )

      expect(response).toBe(mockAttachmentResponse)
    })

    it('should handle network errors gracefully', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Internal Server Error' }
        },
        message: 'Request failed with status code 500'
      })

      await expect(attachFileToIssue(issueKey, file, additionalComment))
        .rejects
        .toThrowError('Request failed with status code 500')
    })
  })
})
