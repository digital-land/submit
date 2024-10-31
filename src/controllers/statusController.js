import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import { finishedProcessingStatuses } from '../utils/utils.js'
import { headingTexts, messageTexts } from '../content/statusPage.js'

class StatusController extends PageController {
  async locals (req, res, next) {
    try {
      req.form.options.data = await getRequestData(req.params.id)
      req.form.options.processingComplete = finishedProcessingStatuses.includes(req.form.options.data.status)
      req.form.options.headingTexts = headingTexts
      req.form.options.messageTexts = messageTexts
      req.form.options.pollingEndpoint = `/api/status/${req.form.options.data.id}`
      super.locals(req, res, next)
    } catch (error) {
      next(error, req, res, next)
    }
  }
}

export default StatusController
