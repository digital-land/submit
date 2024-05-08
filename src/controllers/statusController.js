import PageController from './pageController.js'
import { getRequestData } from '../utils/asyncRequestApi.js'
import { finishedProcessingStatuses } from '../utils/utils.js'

class StatusController extends PageController {
  async configure (req, res, next) {
    try {
      req.session.result = await getRequestData(req.params.id)
      super.configure(req, res, next)
    } catch (error) {
      next(error, req, res, next)
    }
  }

  async locals (req, res, next) {
    req.form.options.data = req.session.result
    req.form.options.processingComplete = finishedProcessingStatuses.includes(req.session.result.status)
    req.form.options.pollingEndpoint = `/api/status/${req.session.result.id}`
    super.locals(req, res, next)
  }
}

export default StatusController
