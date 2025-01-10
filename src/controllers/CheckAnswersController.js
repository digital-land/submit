import PageController from './pageController.js'
import config from '../../config/index.js'
import { attachFileToIssue, createCustomerRequest } from '../services/jiraService.js'

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
        console.log(`Jira issue created: ${issue.issueKey}`)
        req.sessionModel.set('reference', issue.issueKey)
        req.sessionModel.set('errors', [])
      } else {
        req.sessionModel.set('errors', [{ text: 'Failed to create Jira issue.' }])

        return res.redirect('/submit/check-answers') // Redirect on error
      }
    } catch (error) {
      req.sessionModel.set('errors', [{ text: 'An unexpected error occurred while processing your request.' }])

      return res.redirect('/submit/check-answers') // Redirect on error
    }

    super.post(req, res, next)
  }

  async createJiraServiceRequest (req, res, next) {
    const data = {
      name: req.sessionModel.get('name'),
      email: req.sessionModel.get('email'),
      organisation: req.sessionModel.get('lpa'),
      dataset: req.sessionModel.get('dataset'),
      documentationUrl: req.sessionModel.get('documentation-url'),
      endpoint: req.sessionModel.get('endpoint-url')
    }

    const summary = `Dataset URL request: ${data.organisation} for ${data.dataset}`
    const description = `A new dataset request has been made by *${data.name}* from *${data.organisation}* for the dataset *${data.dataset}*.\n\n

    *Details:*\n

    - Name: ${data.name}\n
    - Email: ${data.email}\n
    - Organisation: ${data.organisation}\n
    - Dataset: ${data.dataset}\n
    - Documentation URL: ${data.documentationUrl}\n
    - Endpoint URL: ${data.endpoint}`

    // Generate Jira service request
    const response = await createCustomerRequest(summary, description, config.jira.requestTypeId)

    if (response.error || !response.data) {
      console.error('Failed to create Jira service request', response.error)
      return null
    }

    // Attach CSV file to Jira issue
    const dateNow = new Date().toISOString().split('T')[0]
    const csv = [
      ['organisation', 'pipelines', 'documentation-url', 'endpoint-url', 'start-date', 'licence'],
      [data.organisation, data.dataset, data.documentationUrl, data.endpoint, dateNow, 'ogl3']
    ].map(row => row.join(',')).join('\n')

    const file = new File([csv], `request-${data.organisation}-${data.dataset}-${dateNow}.csv`, { type: 'text/csv' })
    const attachmentResponse = await attachFileToIssue(response.data.issueKey, file)

    if (attachmentResponse.error || !attachmentResponse.data) {
      console.error('Failed to attach file to Jira issue', attachmentResponse.error)
      return null
    }

    return response.data
  }
}

export default CheckAnswersController
