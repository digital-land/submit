import PageController from './pageController.js'
import { getRequestData } from '../utils/publishRequestAPI.js'

class ResultsController extends PageController {
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
    } else if (this.result.hasErrors()) {
      req.form.options.template = 'errors'
    } else {
      req.form.options.template = 'no-errors'
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
