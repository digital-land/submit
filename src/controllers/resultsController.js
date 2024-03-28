import PageController from './pageController.js'
import { getRequestData } from '../utils/publishRequestAPI.js'

class ResultsController extends PageController {
  async configure (req, res, next) {
    try {
      this.result = await getRequestData(req.params.id)
      req.form.options.template = this.result.hasErrors() ? 'errors' : 'no-errors'
      super.configure(req, res, next)
    } catch (error) {
      next(error, req, res, next)
    }
  }

  async locals (req, res, next) {
    if (!this.result.isComplete()) {
      res.redirect(`/status/${req.params.id}`)
      return
    }

    req.form.options.requestParams = this.result.getParams()
    req.form.options.errorSummary = this.result.getErrorSummary()
    req.form.options.columns = this.result.getColumns()
    req.form.options.fields = this.result.getFields()
    req.form.options.verboseRows = this.result.getRowsWithVerboseColumns()

    const geometries = this.result.getGeometries()
    if (geometries.length > 0) {
      req.form.options.geometries = geometries
    }

    super.locals(req, res, next)
  }

  noErrors (req, res, next) {
    return !this.result.hasErrors()
  }
}

export default ResultsController
