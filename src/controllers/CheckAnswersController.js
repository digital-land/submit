import PageController from './pageController.js'

import { newRequestTemplate, requestAcknowledgedTemplate } from '../utils/emailTemplates.js'

const dataManagementEmail = 'fakeymcfake@email.com'

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
  post (req, res, next) {
    this.sendEmails(req, res, next)

    super.post(req, res, next)
  }

  sendEmails (req, res, next) {
    this.sendRequestEmail(req, res, next)
    this.sendAcknowledgementEmail(req, res, next)
  }

  sendAcknowledgementEmail (req, res, next) {
    const name = req.sessionModel.get('name')
    const dataset = req.sessionModel.get('dataset')
    const email = req.sessionModel.get('email')
    const emailTemplate = requestAcknowledgedTemplate
      .replace('{name}', name)
      .replace('{dataset}', dataset)
      .replace('{email}', dataManagementEmail)

    this.sendEmail(email, 'Request Acknowledged', emailTemplate)
  }

  sendRequestEmail (req, res, next) {
    const name = req.sessionModel.get('name')
    const email = req.sessionModel.get('email')
    const organisation = req.sessionModel.get('organisation')
    const dataset = req.sessionModel.get('dataset')
    const emailTemplate = newRequestTemplate
      .replace('{name}', name)
      .replace('{dataset}', dataset)
      .replace('{organisation}', organisation)
      .replace('{email}', email)

    this.sendEmail(dataManagementEmail, 'New Request', emailTemplate)
  }

  sendEmail (to, subject, body) {
    // Send email
    console.log('======')
    console.log(`Sending email to ${to} with subject ${subject} and body:`)
    console.log(body)
  }
}

export default CheckAnswersController
