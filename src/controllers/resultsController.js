import PageController from './pageController.js'
import { getRequestData } from '../utils/asyncRequestApi.js'

const failedRequestTemplate = 'results/failedRequest'
const errorsTemplate = 'results/errors'
const noErrorsTemplate = 'results/no-errors'

class ResultsController extends PageController {
  async locals (req, res, next) {
    const result = await getRequestData(req.params.id)

    if (result.isFailed()) {
      req.form.options.template = failedRequestTemplate
    } else if (result.hasErrors()) {
      req.form.options.template = errorsTemplate
      await result.fetchResponseDetails(req.params.pageNumber, 50, 'error')
    } else {
      req.form.options.template = noErrorsTemplate
      await result.fetchResponseDetails(req.params.pageNumber)
    }

    if (!result.isComplete()) {
      res.redirect(`/status/${req.params.id}`)
      return
    }

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

  async noErrors (req, res, next) {
    const result = await getRequestData(req.params.id)
    return !result.hasErrors()
  }
}

export default ResultsController
