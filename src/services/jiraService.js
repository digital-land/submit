import axios from 'axios'

/**
 * Creates a customer request in JIRA Service Desk.
 *
 * @doc https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-request/#api-rest-servicedeskapi-request-post
 * @param {string} summary - The summary of the customer request.
 * @param {string} description - The description of the customer request.
 * @param {string} requestTypeId - The ID of the request type.
 * @returns {Promise} - A promise that resolves to the response of the JIRA API.
 * @throws {Error} - Throws an error if JIRA_URL, JIRA_API_KEY, or JIRA_SERVICE_DESK_ID are not set.
 */
export async function createCustomerRequest ({ summary, description, raiseOnBehalfOf }, requestTypeId) {
  const JIRA_URL = process.env.JIRA_URL
  const JIRA_API_KEY = process.env.JIRA_API_KEY
  const JIRA_SERVICE_DESK_ID = process.env.JIRA_SERVICE_DESK_ID

  if (!JIRA_URL || !JIRA_API_KEY || !JIRA_SERVICE_DESK_ID) {
    throw new Error('JIRA_URL, JIRA_API_KEY and JIRA_SERVICE_DESK_ID must be set')
  }

  const data = JSON.stringify({
    requestFieldValues: {
      summary,
      description
    },
    serviceDeskId: JIRA_SERVICE_DESK_ID,
    requestTypeId,
    raiseOnBehalfOf
  })

  return await axios.post(`${JIRA_URL}/rest/servicedeskapi/request`, data, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${JIRA_API_KEY}`
    }
  })
}

/**
 * Attaches a file to an existing JIRA issue.
 *
 * @doc https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-servicedesk/#api-rest-servicedeskapi-servicedesk-servicedeskid-attachtemporaryfile-post
 * @doc https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-request/#api-rest-servicedeskapi-request-issueidorkey-attachment-post
 * @param {string} issueKey - The key of the issue to which the file will be attached.
 * @param {File} file - The file to be attached to the issue.
 * @returns {Promise} - A promise that resolves to the response of the JIRA API.
 * @throws {Error} - Throws an error if JIRA_URL, JIRA_API_KEY, or JIRA_SERVICE_DESK_ID are not set.
 */
export async function attachFileToIssue (issueKey, file, additionalComment = 'Please find the file attached.') {
  const JIRA_URL = process.env.JIRA_URL
  const JIRA_API_KEY = process.env.JIRA_API_KEY
  const JIRA_SERVICE_DESK_ID = process.env.JIRA_SERVICE_DESK_ID

  if (!JIRA_URL || !JIRA_API_KEY || !JIRA_SERVICE_DESK_ID) {
    throw new Error('JIRA_URL, JIRA_API_KEY and JIRA_SERVICE_DESK_ID must be set')
  }

  const authHeader = `Bearer ${JIRA_API_KEY}`

  const data = new FormData()
  data.append('file', file)

  const temporaryFiles = await axios.post(`${JIRA_URL}/rest/servicedeskapi/servicedesk/${JIRA_SERVICE_DESK_ID}/attachTemporaryFile`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: authHeader,
      'X-ExperimentalApi': 'opt-in',
      'X-Atlassian-Token': 'no-check'
    }
  })

  if (!temporaryFiles || !temporaryFiles?.data || !temporaryFiles?.data?.temporaryAttachments || temporaryFiles?.data?.temporaryAttachments?.length === 0) {
    throw new Error('Failed to attach file to JIRA issue')
  }

  const temporaryFileId = temporaryFiles.data.temporaryAttachments[0].temporaryAttachmentId
  const attachment = await axios.post(`${JIRA_URL}/rest/servicedeskapi/request/${issueKey}/attachment`, {
    temporaryAttachmentIds: [temporaryFileId],
    additionalComment: {
      body: additionalComment
    },
    public: true
  }, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader
    }
  })

  return attachment
}
