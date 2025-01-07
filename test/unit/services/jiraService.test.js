import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { createCustomerRequest } from '../../../src/services/jiraService'

vi.mock('axios')

describe('createCustomerRequest', () => {
  const summary = 'Test Summary'
  const description = 'Test Description'
  const requestTypeId = '123'

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

    const response = await createCustomerRequest(summary, description, requestTypeId)

    expect(axios.post).toHaveBeenCalledWith(
      'https://jira.example.com/rest/servicedeskapi/request',
      JSON.stringify({
        requestFieldValues: {
          summary,
          description
        },
        serviceDeskId: 'serviceDeskId',
        requestTypeId
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
