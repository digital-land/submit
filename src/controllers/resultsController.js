import PageController from './pageController.js'
import { getRequestData } from '../utils/publishRequestAPI.js'

const failedRequestTemplate = 'failedRequest'
const errorsTemplate = 'errors'
const noErrorsTemplate = 'no-errors'

class ResultsController extends PageController {
  async configure (req, res, next) {
    try {
      this.result = await getRequestData(req.params.id)
      if (this.result.isFailed()) {
        this.template = failedRequestTemplate
      } else if (this.result.hasErrors()) {
        this.template = errorsTemplate
      } else {
        this.template = noErrorsTemplate
      }
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

    req.form.options.template = this.template
    req.form.options.requestParams = this.result.getParams()

    if (this.template !== failedRequestTemplate) {
      req.form.options.errorSummary = this.result.getErrorSummary()
      req.form.options.columns = this.result.getColumns()
      req.form.options.fields = this.result.getFields()
      req.form.options.mappings = this.result.getFieldMappings()
      req.form.options.verboseRows = this.result.getRowsWithVerboseColumns(this.result.hasErrors())
      req.form.options.geometries = this.result.getGeometries()
    } else {
      req.form.options.error = this.result.getError()
    }

    super.locals(req, res, next)
  }

  noErrors (req, res, next) {
    return !this.result.hasErrors()
  }
}

export default ResultsController
