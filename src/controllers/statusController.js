import PageController from './pageController.js'
import { getRequestData } from '../utils/publishRequestAPI.js'

class StatusController extends PageController {
  async configure (req, res, next) {
    try {
      this.result = await getRequestData(req.params.id);
      req.form.options.template = this.result.hasErrors() ? 'errors' : 'no-errors';
    } catch (error) {
      req.form.options.template = error.message === 'Request not found' ? '404' : '500';
    }

    super.configure(req, res, next)
  }

  async locals (req, res, next) {
    req.form.options.data = this.result
    super.locals(req, res, next)
  }
}

export default StatusController
