import PageController from './pageController.js'
import { getRequestData } from '../utils/asyncRequestApi.js'
import { finishedProcessingStatuses } from '../utils/utils.js'

class StatusController extends PageController {
  async locals (req, res, next) {
    const result = await getRequestData(req.params.id)
    req.form.options.data = result
    req.form.options.processingComplete = finishedProcessingStatuses.includes(result.status)
    req.form.options.pollingEndpoint = `/api/status/${result.id}`
    super.locals(req, res, next)
  }
}

export default StatusController
