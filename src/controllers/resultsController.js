import PageController from './pageController.js'
import { getRequestData } from '../utils/asyncRequestApi.js'

const failedFileRequestTemplate = 'results/failedFileRequest'
const failedUrlRequestTemplate = 'results/failedUrlRequest'
const errorsTemplate = 'results/errors'
const noErrorsTemplate = 'results/no-errors'

class ResultsController extends PageController {
  async configure (req, res, next) {
    try {
      this.result = await getRequestData(req.params.id)
      if (!this.result.isComplete()) {
        res.redirect(`/status/${req.params.id}`)
        return
      } else if (this.result.isFailed()) {
        if (this.result.getType() === 'check_file') {
          this.template = failedFileRequestTemplate
        } else {
          this.template = failedUrlRequestTemplate
        }
      } else if (this.result.hasErrors()) {
        this.template = errorsTemplate
        await this.result.fetchResponseDetails(req.params.pageNumber, 50, 'error')
      } else {
        this.template = noErrorsTemplate
        await this.result.fetchResponseDetails(req.params.pageNumber)
      }

      super.configure(req, res, next)
    } catch (error) {
      next(error, req, res, next)
    }
  }

  async locals (req, res, next) {
    req.form.options.template = this.template
    req.form.options.requestParams = this.result.getParams()

    if (this.template !== failedFileRequestTemplate && this.template !== failedUrlRequestTemplate) {
      req.form.options.errorSummary = this.result.getErrorSummary()
      req.form.options.columns = this.result.getColumns()
      req.form.options.fields = this.result.getFields()
      req.form.options.mappings = this.result.getFieldMappings()
      req.form.options.verboseRows = this.result.getRowsWithVerboseColumns(this.result.hasErrors())
      req.form.options.geometries = this.result.getGeometries()
      req.form.options.pagination = this.result.getPagination(req.params.pageNumber)
      req.form.options.id = req.params.id
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
