import PageController from './pageController.js'
import { getRequestData } from '../utils/publishRequestAPI.js'
import { finishedProcessingStatuses } from '../utils/utils.js'

class StatusController extends PageController {
  async configure (req, res, next) {
    try{
      this.result = await getRequestData(req.params.id)
      super.configure(req, res, next)
    }catch(error){
      next(error, req, res, next)
    }
  }

  async locals (req, res, next) {
    req.form.options.data = this.result
    req.form.options.processingComplete = finishedProcessingStatuses.includes(this.result.status)
    super.locals(req, res, next)
  }
}

export default StatusController
