import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import { finishedProcessingStatuses } from '../utils/utils.js'
import { headingTexts, messageTexts, buttonTexts, buttonAriaLabels } from '../content/statusPage.js'

/**
 * Attempts to infer how we ended up on this page.
 *
 * @param req
 * @returns {string?}
 */
function getLastPage (req) {
  let lastPage
  if ('url' in req.form.options.data.params) {
    lastPage = '/check/url'
  } else if ('original_filename' in req.form.options.data.params) {
    lastPage = '/check/upload'
  }
  return lastPage
}

class StatusController extends PageController {
  async locals (req, res, next) {
    try {
      req.form.options.data = await getRequestData(req.params.id)
      req.form.options.processingComplete = finishedProcessingStatuses.includes(req.form.options.data.status)
      req.form.options.headingTexts = headingTexts
      req.form.options.messageTexts = messageTexts
      req.form.options.buttonTexts = buttonTexts
      req.form.options.buttonAriaLabels = buttonAriaLabels
      req.form.options.pollingEndpoint = `/api/status/${req.form.options.data.id}`
      const now = new Date()
      req.form.options.lastUpdated = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).replace(' ', '').toLowerCase() +
        ' on ' +
        now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
      const lastPage = getLastPage(req)
      if (lastPage) {
        req.form.options.lastPage = lastPage
      }
      super.locals(req, res, next)
    } catch (error) {
      next(error, req, res, next)
    }
  }
}

export default StatusController
