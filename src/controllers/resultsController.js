import PageController from './pageController.js'
import { getRequestData } from '../utils/publishRequestAPI.js'

class ResultsController extends PageController {
  async configure (req, res, next) {
    try {
      this.result = await getRequestData(req.params.id)
      req.form.options.template = this.result.hasErrors() ? 'errors' : 'no-errors'
    } catch (error) {
      req.form.options.template = error.message === 'Request not found' ? '404' : '500'
    }

    super.configure(req, res, next)
  }

  async locals (req, res, next) {
    if (!this.result.isComplete()) {
      res.redirect(`/status/${req.params.id}`)
      return
    }

    req.form.options.requestParams = this.result.getParams()
    req.form.options.errorSummary = this.result.getErrorSummary()
    req.form.options.rows = this.result.getRows()
    req.form.options.geometryKey = this.result.getGeometryKey()
    req.form.options.columns = this.result.getColumns()
    req.form.options.fields = this.result.getFields()
    req.form.options.verboseRows = this.result.getRowsWithVerboseColumns()

    super.locals(req, res, next)
  }

  noErrors (req, res, next) {
    return !this.result.hasErrors()
  }
}

export default ResultsController
