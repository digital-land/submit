import PageController from './pageController.js'
import config from '../../config/index.js'
import { addInternalNoteToIssue, attachFileToIssue, createCustomerRequest } from '../services/jiraService.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { stringify } from 'csv-stringify/sync'
import { getRequestData } from '../services/asyncRequestApi.js'
import { getDatasets } from '../utils/utils.js'

class CheckAnswersController extends PageController {
  async locals (req, res, next) {
    const requestId = req.sessionModel.get('requestId')
    const dataset = req.sessionModel.get('dataset')
    if (!requestId || !dataset) {
      return res.redirect('/check/url')
    }
    try {
      const requestData = await getRequestData(requestId)
      const endpointUrl = requestData.getParams()?.url
      req.form.options.endpointUrl = endpointUrl
      req.sessionModel.set('endpoint-url', endpointUrl)
    } catch (error) {
      logger.warn('CheckAnswersController.locals(): failed to fetch request data', {
        requestId,
        errorMessage: error.message,
        type: types.External
      })
    }
    super.locals(req, res, next)
  }

  /**
   * Handles the HTTP POST request for choosing a dataset.
   * during this, we will perform a few actions
   * firstly, we will email Jira causing the creation of a ticket (this will be implemented at a later date)
   * secondly, we will email the management team to inform them of the request
   * finally, we will email the LPA/organisation to inform them that their request has been acknowledged
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async post (req, res, next) {
    try {
      const issue = await this.createJiraServiceRequest(req, res, next)
      if (issue?.localJiraFallback) {
        return res.json({
          message: issue.message,
          manageServiceLink: issue.manageServiceLink
        })
      }
      if (issue) {
        req.sessionModel.set('reference', issue.issueKey)
        req.sessionModel.set('errors', [])
        req.sessionModel.set('processing', true)
      } else {
        req.sessionModel.set('errors', [{ text: 'An unexpected error occurred while processing your request.' }])
        return res.redirect('/submit/check-answers')
      }
    } catch (error) {
      logger.error('CheckAnswersController.post(): Failed to create Jira issue', {
        errorMessage: error.message,
        errorStack: error,
        type: types.External
      })
      req.sessionModel.set('errors', [{ text: 'An unexpected error occurred while processing your request.' }])
      return res.redirect('/submit/check-answers')
    }

    super.post(req, res, next)
  }

  async createJiraServiceRequest (req, res, next) {
    const data = {
      name: req.sessionModel.get('name'),
      email: req.sessionModel.get('email'),
      organisationId: req.sessionModel.get('orgId'),
      organisationName: req.sessionModel.get('lpa'),
      dataset: req.sessionModel.get('dataset'),
      documentationUrl: req.sessionModel.get('documentation-url'),
      endpoint: req.sessionModel.get('endpoint-url'),
      geomType: req.sessionModel.get('geomType')
    }
    const datasets = await getDatasets()
    const dataset = req.sessionModel.get('dataset')
    const datasetMeta = datasets.get(dataset) || {} // eslint-disable-line no-unused-vars
    const requestId = req.sessionModel.get('requestId')
    const checkTool = requestId
      ? `${config.url}check/results/${requestId}/${config.jira.requestTypeId}`
      : 'Check tool link unavailable'
    const manageServiceLink = buildManageServiceLink(requestId, data)

    // Theres no point in attempting to create a Jira issue if we're going to fail, so we check
    // first and return early with a message about using the Manage Service for local development
    // if Jira isn't configured
    if (config.environment === 'local' && !isJiraConfigured()) {
      return {
        localJiraFallback: true,
        message: 'Jira is not configured for local development. Use this Manage Service link to add the data.',
        manageServiceLink
      }
    }

    const isNonProd = ['local', 'development', 'staging'].includes(config.environment)
    const summary = `${isNonProd ? '[TEST] ' : ''}Dataset URL request: ${data.organisationName} for ${data.dataset}`
    const description = `A new dataset request has been made by *${data.name}* from *${data.organisationName} (${data.organisationId})* for the dataset *${data.dataset}*.\n\n

    *Details:*\n

    - Name: ${data.name}\n
    - Email: ${data.email}\n
    - Organisation ID: ${data.organisationId}\n
    - Organisation Name: ${data.organisationName}\n
    - Dataset: ${data.dataset}\n
    - Documentation URL: ${data.documentationUrl}\n
    - Endpoint URL: ${data.endpoint}\n
    ${data.dataset === 'tree' ? `- Geometry Type: ${data.geomType}\n\n` : ''}- Check Tool: ${checkTool}`

    // Generate Jira service request
    const response = await createCustomerRequest({
      summary,
      description,
      raiseOnBehalfOf: data.email
    }, config.jira.requestTypeId)

    if (response.error || !response.data) {
      logger.error('CheckAnswersController.createJiraServiceRequest(): Failed to create Jira service request', {
        errorMessage: response.error.message,
        errorStack: response.error,
        type: types.External
      })
      return null
    }

    const internalNote = `This request is ready to be added in the Manage Service.\n\n[Open this request in Manage Service|${manageServiceLink}]\n\nIf the link does not open, copy and paste this URL in your browser:\n${manageServiceLink}`
    await addInternalNoteToIssue(response.data.issueKey, internalNote).catch((error) => {
      logger.error('CheckAnswersController.addInternalNoteToIssue(): Failed to add internal note to Jira issue', {
        errorMessage: error.message,
        errorStack: error,
        type: types.External
      })
    })

    await this.attachFileToIssue(requestId, data, description, response).catch((error) => {
      logger.error('CheckAnswersController.attachFileToIssue(): Failed to attach CSV to Jira issue', {
        errorMessage: error.message,
        errorStack: error,
        type: types.External
      })
    })
    return response.data
  }

  /**
   * Asynchronously generates and attaches a CSV file to the created Jira issue.
   *
   * This method polls the request API to retrieve the plugin information,
   * constructs a CSV with the request details, and attaches it to the Jira issue.
   * It is designed to run in the background without blocking the main response.
   *
   * @param {string} requestId - The ID of the request to poll for plugin data.
   * @param {Object} data - The data object containing request details (organisation, dataset, etc.).
   * @param {string} description - The description of the issue (used as a comment for the attachment).
   * @param {Object} response - The response object from the Jira issue creation, containing the issue key.
   * @returns {Promise<void>}
   */
  async attachFileToIssue (requestId, data, description, response) {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    let requestData = null
    let plugin = null
    let retry = 0

    // Request data may not be immediately available, poll until we have it from Async Request API for plugin value
    if (requestId) {
      while (plugin == null && retry < 6 && requestData?.isComplete?.() !== true) {
        try {
          requestData = await getRequestData(requestId)
        } catch (error) {
          logger.error(`Failed get request data info for ${requestId}`, {
            errorMessage: error.message,
            errorStack: error,
            type: types.External
          })
          requestData = null
        }

        plugin = requestData?.getPlugin?.()

        if (plugin == null) {
          retry += 1
          await sleep(5000)
        }
      }
    }

    // Create Parameters for CSV attachment
    const dateNow = new Date().toISOString().split('T')[0]
    const csvData = [
      ['organisation', 'pipelines', 'documentation-url', 'endpoint-url', 'start-date', 'plugin', 'licence'],
      [data.organisationId, data.dataset, data.documentationUrl, data.endpoint, dateNow, plugin, 'ogl3']
    ]
    const csv = stringify(csvData)

    // Send attachment to Jira issue
    const file = new File([csv], `request-${data.organisationId}-${data.dataset}-${dateNow}.csv`, { type: 'text/csv' })
    const attachmentResponse = await attachFileToIssue(response.data.issueKey, file, description)

    if (attachmentResponse.error || !attachmentResponse.data) {
      logger.error('jiraService.attachFileToIssue(): Failed to attach file to Jira issue', {
        errorMessage: attachmentResponse.error.message,
        errorStack: attachmentResponse.error,
        type: types.External
      })
    }
  }
}

function buildManageServiceLink (requestId, data) {
  const urlSearchParams = new URLSearchParams({ requestId, documentationUrl: data.documentationUrl })
  return `${config.manageServiceUrl}/datamanager${urlSearchParams.toString() ? `?${urlSearchParams.toString()}` : ''}`
}

function isJiraConfigured () {
  return Boolean(process.env.JIRA_URL && process.env.JIRA_API_KEY && process.env.JIRA_SERVICE_DESK_ID)
}

export default CheckAnswersController
