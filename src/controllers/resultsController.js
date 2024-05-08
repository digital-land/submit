import PageController from './pageController.js'
import { getRequestData } from '../utils/asyncRequestApi.js'

const failedRequestTemplate = 'results/failedRequest'
const errorsTemplate = 'results/errors'
const noErrorsTemplate = 'results/no-errors'

class ResultsController extends PageController {
  async configure (req, res, next) {
    try {
      const result = await getRequestData(req.params.id)
      req.session.result = result
      
      if (result.isFailed()) {
        req.session.template = failedRequestTemplate
      } else if (result.hasErrors()) {
        req.session.template = errorsTemplate
        await result.fetchResponseDetails(req.params.pageNumber, 50, 'error')
      } else {
        req.session.template = noErrorsTemplate
        await result.fetchResponseDetails(req.params.pageNumber)
      }

      super.configure(req, res, next)
    } catch (error) {
      next(error, req, res, next)
    }
  }

  async locals (req, res, next) {
    const result = req.session.result

    if (!result.isComplete()) {
      res.redirect(`/status/${req.params.id}`)
      return
    }

    req.form.options.template = req.session.template
    req.form.options.requestParams = result.getParams()

    if (req.session.template !== failedRequestTemplate) {
      req.form.options.errorSummary = result.getErrorSummary()
      req.form.options.columns = result.getColumns()
      req.form.options.fields = result.getFields()
      req.form.options.mappings = result.getFieldMappings()
      req.form.options.verboseRows = result.getRowsWithVerboseColumns(result.hasErrors())
      req.form.options.geometries = result.getGeometries()
      req.form.options.pagination = result.getPagination(req.params.pageNumber)
      req.form.options.id = req.params.id
    } else {
      req.form.options.error = result.getError()
    }

    super.locals(req, res, next)
  }

  noErrors (req, res, next) {
    const result = req.session.result
    return !result.hasErrors()
  }
}

export default ResultsController
