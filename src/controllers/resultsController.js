import PageController from './pageController.js'
import publishRequestApi from '../utils/publishRequestAPI.js'

class ResultsController extends PageController {
  async configure (req, res, next) {
    this.result = await publishRequestApi.getRequestData(req.params.id)

    if (this.result.hasErrors()) {
      req.form.options.template = 'errors'
    } else {
      req.form.options.template = 'no-errors'
    }

    super.configure(req, res, next)
  }

  async locals (req, res, next) {
    // ToDo: handle the case where the result is not found
    if (this.result === undefined) {
      res.redirect('/error')
    }
    if (!this.result.isComplete()) {
      res.redirect(`/status/${req.params.id}`)
    }

    res.form.options.result = this.result

    super.locals(req, res, next)
  }

  noErrors (req, res, next) {
    return !this.result.hasErrors()
  }
}

export default ResultsController
