'use strict'

import PageController from './pageController.js'

class NoErrorsController extends PageController {
  locals (req, res, next) {
    const validationResult = req.sessionModel.get('validationResult')
    const rows = validationResult['converted-csv']
    const columnHeaders = validationResult['column-field-log'].map(column => column.column)

    // if uploading a polygon, the geometry column will be called 'geometry'
    // if uploading a point, the geometry column will be called 'point'

    const geomType = req.sessionModel.get('geomType')
    let geometryKey
    if (geomType === 'point') {
      geometryKey = validationResult['column-field-log'].find(column => column.field === 'point').column
    } else {
      geometryKey = validationResult['column-field-log'].find(column => column.field === 'geometry').column
    }

    req.form.options.rows = rows
    req.form.options.headers = columnHeaders
    req.form.options.geometryKey = geometryKey
    super.locals(req, res, next)
  }
}

export default NoErrorsController
