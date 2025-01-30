import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import prettifyColumnName from '../filters/prettifyColumnName.js'

const failedFileRequestTemplate = 'results/failedFileRequest'
const failedUrlRequestTemplate = 'results/failedUrlRequest'
const errorsTemplate = 'results/errors'
const noErrorsTemplate = 'results/no-errors'

class ResultsController extends PageController {
  /* Custom middleware */
  middlewareSetup () {
    super.middlewareSetup()
    this.use(getRequestDataMiddleware)
    this.use(setupTemplate)
    this.use(fetchResponseDetails)
    this.use(setupTableParams)
    this.use(setupErrorSummary)
    this.use(setupError)
  }

  async locals (req, res, next) {
    try {
      Object.assign(req.form.options, req.locals)
      super.locals(req, res, next)
    } catch (error) {
      next(error, req, res, next)
    }
  }

  noErrors (req, res, next) {
    return !req.form.options.data.hasErrors()
  }
}

export async function getRequestDataMiddleware (req, res, next) {
  try {
    req.locals = {
      requestData: await getRequestData(req.params.id)
    }
    if (!req.locals.requestData.isComplete()) {
      res.redirect(`/check/status/${req.params.id}`)
      return
    }
    next()
  } catch (error) {
    next(error, req, res, next)
  }
}

export async function setupTemplate (req, res, next) {
  try {
    if (req.locals.requestData.isFailed()) {
      if (req.locals.requestData.getType() === 'check_file') {
        req.locals.template = failedFileRequestTemplate
      } else {
        req.locals.template = failedUrlRequestTemplate
      }
    } else if (req.locals.requestData.hasErrors()) {
      req.locals.template = errorsTemplate
    } else {
      req.locals.template = noErrorsTemplate
    }
    req.locals.requestParams = req.locals.requestData.getParams()
    next()
  } catch (e) {
    next(e, req, res, next)
  }
}

export async function fetchResponseDetails (req, res, next) {
  try {
    if (req.locals.template !== failedFileRequestTemplate && req.locals.template !== failedUrlRequestTemplate) {
      const responseDetails = req.locals.template === errorsTemplate
        ? await req.locals.requestData.fetchResponseDetails(req.params.pageNumber, 50, 'error')
        : await req.locals.requestData.fetchResponseDetails(req.params.pageNumber)
      req.locals.responseDetails = responseDetails
    }
  } catch (e) {
    next(e, req, res, next)
    return
  }
  next()
}

export async function setupTableParams (req, res, next) {
  if (req.locals.template !== failedFileRequestTemplate && req.locals.template !== failedUrlRequestTemplate) {
    const responseDetails = req.locals.responseDetails
    let rows = responseDetails.getRowsWithVerboseColumns(req.locals.requestData.hasErrors())

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

    req.locals.tableParams = {
      columns: responseDetails.getColumns().map(column => prettifyColumnName(column)),
      rows,
      fields: responseDetails.getFields()
    }

    req.locals.mappings = responseDetails.getFieldMappings()
    req.locals.geometries = responseDetails.getGeometries()
    req.locals.pagination = responseDetails.getPagination(req.params.pageNumber)
    req.locals.id = req.params.id
    req.locals.lastPage = `/check/status/${req.params.id}`
  }
  next()
}

export async function setupErrorSummary (req, res, next) {
  if (req.locals.template !== failedFileRequestTemplate && req.locals.template !== failedUrlRequestTemplate) {
    req.locals.errorSummary = req.locals.requestData.getErrorSummary().map(message => {
      return {
        text: message,
        href: ''
      }
    })
  }
  next()
}

export async function setupError (req, res, next) {
  if (req.locals.template === failedFileRequestTemplate || req.locals.template === failedUrlRequestTemplate) {
    req.locals.error = req.locals.requestData.getError()
  }
  next()
}

export default ResultsController
