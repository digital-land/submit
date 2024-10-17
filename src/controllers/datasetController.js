'use strict'

import PageController from './pageController.js'

// ToDo: we shouldn't hardcode these values here, should we get them from the API
//  maybe take from specification
import { dataSubjects, datasets, availableDatasets } from '../utils/utils.js'

/**
 * @param {Object} req
 * @returns {boolean}
 */
export function requiresGeometryTypeToBeSelected (req) {
  const dataset = req.body.dataset
  const dataSet = datasets.get(dataset)
  return dataSet?.requiresGeometryTypeSelection || false
}

/**
 * @param {Object} req - The HTTP request object.
 * @returns {boolean}
 */
export function requiresGeometryTypeToBeSelectedViaDeepLink (req) {
  const { dataset } = req.query
  const dataSet = datasets.get(dataset)
  return dataSet?.requiresGeometryTypeSelection || false
}

class DatasetController extends PageController {
  locals (req, res, next) {
    req.form.options.datasetItems = availableDatasets(dataSubjects)
    super.locals(req, res, next)
  }

  // we shouldn't need this here but as we dont currently set the datasubject, we need to do so here
  post (req, res, next) {
    const dataset = req.body.dataset
    const { dataSubject } = datasets.get(dataset) || { dataSubject: '' }
    req.body['data-subject'] = dataSubject
    super.post(req, res, next)
  }
}

export default DatasetController
