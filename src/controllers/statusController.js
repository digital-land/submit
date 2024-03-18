import PageController from './pageController.js'
import publishRequestApi from '../utils/publishRequestAPI.js'

class StatusController extends PageController {
  async locals (req, res, next) {
    const result = await publishRequestApi.getRequestData(req.params.id)
    req.form.options.data = result
    super.locals(req, res, next)
  }
}

export default StatusController
