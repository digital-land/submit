import PageController from './pageController.js'
import { getRequestData } from '../utils/asyncRequestApi.js'
import { finishedProcessingStatuses } from '../utils/utils.js'

class StatusController extends PageController {
  async locals (req, res, next) {
    const requestData = await getRequestData(req.params.id)
    req.form.options.data = requestData
    req.form.options.processingComplete = finishedProcessingStatuses.includes(requestData.status)
    req.form.options.pollingEndpoint = `/api/status/${requestData.id}`
    super.locals(req, res, next)
  }
}

export default StatusController
