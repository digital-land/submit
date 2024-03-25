import PageController from './pageController.js'
import { getRequestData } from '../utils/publishRequestAPI.js'

class ResultsController extends PageController {
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
    if (!this.result.isComplete()) {
      res.redirect(`/status/${req.params.id}`)
      return
    }

    req.form.options.result = this.result

    super.locals(req, res, next)
  }

  noErrors (req, res, next) {
    return !this.result.hasErrors()
  }
}

export default ResultsController
