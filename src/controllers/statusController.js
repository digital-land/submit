import PageController from './pageController.js'
import { getRequestData } from '../utils/publishRequestAPI.js'

class StatusController extends PageController {
  async configure (req, res, next) {
    this.result = await getRequestData(req.params.id)

    if (this.result.response && this.result.response.error) {
      switch (this.result.response.error.code) {
        case 404:
          req.form.options.template = '404'
          break
        default:
          req.form.options.template = '500'
          break
      }
    }

    req.form.options.data = this.result
    super.configure(req, res, next)
  }
}

export default StatusController
