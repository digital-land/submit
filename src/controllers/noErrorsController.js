'use strict'

import PageController from './pageController.js'

class NoErrorsController extends PageController {
  locals (req, res, next) {
    const validationResult = req.sessionModel.get('validationResult')
    const rows = validationResult['converted-csv']
    const columnHeaders = validationResult['column-field-log'].map(column => column.column)

    req.form.options.rows = rows
    req.form.options.headers = columnHeaders
    super.locals(req, res, next)
  }
}

export default NoErrorsController
