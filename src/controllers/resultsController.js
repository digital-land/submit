import PageController from './pageController.js'
import { getRequestData } from '../utils/asyncRequestApi.js'

const failedFileRequestTemplate = 'results/failedFileRequest'
const failedUrlRequestTemplate = 'results/failedUrlRequest'
const errorsTemplate = 'results/errors'
const noErrorsTemplate = 'results/no-errors'

class ResultsController extends PageController {
  async locals (req, res, next) {
    try {
      const requestData = await getRequestData(req.params.id)
      req.form.options.data = requestData

      let responseDetails

      if (!requestData.isComplete()) {
        res.redirect(`/status/${req.params.id}`)
        return
      } else if (req.form.options.data.isFailed()) {
        if (req.form.options.data.getType() === 'check_file') {
          req.form.options.template = failedFileRequestTemplate
        } else {
          req.form.options.template = failedUrlRequestTemplate
        }
      } else if (req.form.options.data.hasErrors()) {
        req.form.options.template = errorsTemplate
        responseDetails = await requestData.fetchResponseDetails(req.params.pageNumber, 50, 'error')
      } else {
        req.form.options.template = noErrorsTemplate
        responseDetails = await requestData.fetchResponseDetails(req.params.pageNumber)
      }

      req.form.options.requestParams = requestData.getParams()

      if (req.form.options.template !== failedFileRequestTemplate && req.form.options.template !== failedUrlRequestTemplate) {
        req.form.options.errorSummary = requestData.getErrorSummary()
        req.form.options.columns = responseDetails.getColumns()
        req.form.options.fields = responseDetails.getFields()
        req.form.options.mappings = responseDetails.getFieldMappings()
        req.form.options.verboseRows = responseDetails.getRowsWithVerboseColumns(requestData.hasErrors())
        req.form.options.geometries = responseDetails.getGeometries()
        req.form.options.pagination = responseDetails.getPagination(req.params.pageNumber)
        req.form.options.id = req.params.id
      } else {
        req.form.options.error = requestData.getError()
      }

      super.locals(req, res, next)
    } catch (error) {
      next(error, req, res, next)
    }
  }

  noErrors (req, res, next) {
    return !req.form.options.data.hasErrors()
  }
}

export default ResultsController
