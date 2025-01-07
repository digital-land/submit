import axios from 'axios'

/**
 * Creates a customer request in JIRA Service Desk.
 *
 * @param {string} summary - The summary of the customer request.
 * @param {string} description - The description of the customer request.
 * @param {string} requestTypeId - The ID of the request type.
 * @returns {Promise} - A promise that resolves to the response of the JIRA API.
 * @throws {Error} - Throws an error if JIRA_URL, JIRA_BASIC_AUTH, or JIRA_SERVICE_DESK_ID are not set.
 */
export async function createCustomerRequest (summary, description, requestTypeId) {
  const JIRA_URL = process.env.JIRA_URL
  const JIRA_BASIC_AUTH = process.env.JIRA_BASIC_AUTH
  const JIRA_SERVICE_DESK_ID = process.env.JIRA_SERVICE_DESK_ID

  if (!JIRA_URL || !JIRA_BASIC_AUTH || !JIRA_SERVICE_DESK_ID) {
    throw new Error('JIRA_URL, JIRA_BASIC_AUTH and JIRA_SERVICE_DESK_ID must be set')
  }

  const data = JSON.stringify({
    requestFieldValues: {
      summary,
      description
    },
    serviceDeskId: JIRA_SERVICE_DESK_ID,
    requestTypeId
  })

  return axios.post(`${JIRA_URL}/rest/servicedeskapi/request`, data, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${JIRA_BASIC_AUTH}`
    }
  })
}
