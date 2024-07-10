import PageController from './pageController.js'
import notifyClient from '../utils/mailClient.js'
import config from '../../config/index.js'

const dataManagementEmail = process.env.DATA_MANAGEMENT_EMAIL || config.email.dataManagementEmail

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
    const result = await this.sendEmails(req, res, next)
    for (const err of (result.errors ?? [])) {
      console.error(err)
    }

    super.post(req, res, next)
  }

  /**
   * Attempts to send email notifications.
   *
   * @param {*} req
   * @param {*} res
   * @param {*} next
   * @returns {Promise<{} | {errors: string[]}>}
   */
  async sendEmails (req, res, next) {
    const name = req.sessionModel.get('name')
    const email = req.sessionModel.get('email')
    const organisation = req.sessionModel.get('lpa')
    const dataset = req.sessionModel.get('dataset')
    const documentationUrl = req.sessionModel.get('documentation-url')
    const endpoint = req.sessionModel.get('endpoint-url')

    const { RequestTemplateId, AcknowledgementTemplateId } =
      config.email.templates

    const personalisation = {
      name,
      email,
      organisation,
      endpoint,
      'documentation-url': documentationUrl,
      dataset
    }

    const [reqResult, ackResult] = await Promise.allSettled([
      notifyClient.sendEmail(RequestTemplateId, dataManagementEmail, {
        personalisation
      }),
      notifyClient.sendEmail(AcknowledgementTemplateId, email, {
        personalisation
      })
    ])

    const errors = []
    if (reqResult.status === 'rejected') {
      const msg = emailFailureMessage(RequestTemplateId, personalisation)
      errors.push(msg)
    }
    if (ackResult.status === 'rejected') {
      const msg = emailFailureMessage(AcknowledgementTemplateId, personalisation)
      errors.push(msg)
    }

    if (errors.length !== 0) {
      return { errors }
    }
    return {}
  }
}

/**
 *
 * @param {string} templateId
 * @param {{organisation: string, name: string, email: string}} metadata
 * @returns
 */
function emailFailureMessage (templateId, { organisation, name, email }) {
  return `Failed to send email template=${templateId} to (org: ${organisation}, name: ${name}, email: ${email}):`
}

export default CheckAnswersController
