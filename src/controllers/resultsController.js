import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import prettifyColumnName from '../filters/prettifyColumnName.js'

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
        res.redirect(`/check/status/${req.params.id}`)
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
        let rows = responseDetails.getRowsWithVerboseColumns(requestData.hasErrors())

        // remove any issues that aren't of severity error
        rows = rows.map((row) => {
          const { columns, ...rest } = row

          const columnsOnlyErrors = Object.fromEntries(Object.entries(columns).map(([key, value]) => {
            let error
            if (value.error && value.error.severity === 'error') {
              error = value.error
            }
            const newValue = {
              ...value,
              error
            }
            return [key, newValue]
          }))

          return {
            ...rest,
            columns: columnsOnlyErrors
          }
        })

        req.form.options.tableParams = {
          columns: responseDetails.getColumns().map(column => prettifyColumnName(column)),
          rows,
          fields: responseDetails.getFields()
        }

        req.form.options.errorSummary = requestData.getErrorSummary()
        req.form.options.mappings = responseDetails.getFieldMappings()
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
