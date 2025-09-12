import PageController from './pageController.js'
import config from '../../config/index.js'
import { attachFileToIssue, createCustomerRequest } from '../services/jiraService.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { stringify } from 'csv-stringify/sync'
import { postUrlRequest } from '../services/asyncRequestApi.js'
import SubmitUrlController from './submitUrlController.js'
import { datasets } from '../utils/utils.js'

class CheckAnswersController extends PageController {
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
      if (issue) {
        req.sessionModel.set('reference', issue.issueKey)
        req.sessionModel.set('errors', [])
        req.sessionModel.set('processing', true)
      } else {
        req.sessionModel.set('errors', [{ text: 'Failed to create Jira issue.' }])

        return res.redirect('/submit/check-answers') // Redirect on error
      }
    } catch (error) {
      logger.error('CheckAnswersController.post(): Failed to create Jira issue', {
        errorMessage: error.message,
        errorStack: error,
        type: types.External
      })
      req.sessionModel.set('errors', [{ text: 'An unexpected error occurred while processing your request.' }])

      return res.redirect('/submit/check-answers') // Redirect on error
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
    const dataset = req.sessionModel.get('dataset')
    const datasetMeta = datasets.get(dataset) || {}
    const url = req.body.url || req.sessionModel.get('endpoint-url')
    if (!url) {
      logger.error('No Endpoint URL provided.')
      req.sessionModel.set('errors', [{ text: 'A valid Endpoint URL is required to proceed.' }])
      return null
    }

    const URLvalidationError = await SubmitUrlController.localUrlValidation(url)
    if (URLvalidationError) {
      logger.warn(`URL validation failed for submitted URL: ${url}`)
      req.sessionModel.set('errors', [{ text: 'A valid Endpoint URL is required to proceed.' }])
      return null
    }

    const formData = {
      url,
      dataset: req.sessionModel.get('dataset'),
      collection: datasetMeta.dataSubject,
      geomType: req.sessionModel.get('geomType')
    }
    let requestId
    try {
      requestId = await postUrlRequest(formData)
    } catch (error) {
      logger.error('Failed to submit URL request:', {
        errorMessage: error.message,
        errorStack: error,
        type: types.External
      })
      requestId = null
    }
    const checkTool = requestId
      ? `${config.url}check/results/${requestId}/${config.jira.requestTypeId}`
      : 'Check tool link unavailable'

    const summary = `Dataset URL request: ${data.organisationName} for ${data.dataset}`
    const description = `A new dataset request has been made by *${data.name}* from *${data.organisationName} (${data.organisationId})* for the dataset *${data.dataset}*.\n\n

    *Details:*\n

    - Name: ${data.name}\n
    - Email: ${data.email}\n
    - Organisation ID: ${data.organisationId}\n
    - Organisation Name: ${data.organisationName}\n
    - Dataset: ${data.dataset}\n
    - Documentation URL: ${data.documentationUrl}\n
    - Endpoint URL: ${data.endpoint}\n
    - ${data.dataset === 'tree' ? `Geometry Type: ${data.geomType}` : ''}\n
    - Check Tool: ${checkTool}`

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

    // Create CSV to attach to Jira issue
    const dateNow = new Date().toISOString().split('T')[0]
    const csvData = [
      ['organisation', 'pipelines', 'documentation-url', 'endpoint-url', 'start-date', 'licence'],
      [data.organisationId, data.dataset, data.documentationUrl, data.endpoint, dateNow, 'ogl3']
    ]
    const csv = stringify(csvData)

    const file = new File([csv], `request-${data.organisationId}-${data.dataset}-${dateNow}.csv`, { type: 'text/csv' })
    const attachmentResponse = await attachFileToIssue(response.data.issueKey, file, description)

    if (attachmentResponse.error || !attachmentResponse.data) {
      logger.error('CheckAnswersController.createJiraServiceRequest(): Failed to attach file to Jira issue', {
        errorMessage: attachmentResponse.error.message,
        errorStack: attachmentResponse.error,
        type: types.External
      })
      return null
    }
    return response.data
  }
}

export default CheckAnswersController
