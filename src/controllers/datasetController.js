'use strict'

import PageController from './pageController.js'

// ToDo: we shouldn't hardcode these values here, should we get them from the API
//  maybe take from specification
import { getDataSubjects, getDatasets, availableDatasets } from '../utils/utils.js'

/**
 * @param {Object} req
 * @returns {boolean}
 */
export async function requiresGeometryTypeToBeSelected (req) {
  const datasets = await getDatasets()
  const dataset = req.body.dataset
  const dataSet = datasets.get(dataset)
  return dataSet?.requiresGeometryTypeSelection || false
}

/**
 * @param {Object} req - The HTTP request object.
 * @returns {boolean}
 */
export async function requiresGeometryTypeToBeSelectedViaDeepLink (req) {
  const datasets = await getDatasets()
  const { dataset } = req.query
  const dataSet = datasets.get(dataset)
  return dataSet?.requiresGeometryTypeSelection || false
}

class DatasetController extends PageController {
  async locals (req, res, next) {
    try {
      const dataSubjects = await getDataSubjects()
      req.form.options.datasetItems = availableDatasets(dataSubjects)
      return await super.locals(req, res, next)
    } catch (err) {
      req.handlerName = 'DatasetController.locals'
      return next(err)
    }
  }

  // we shouldn't need this here but as we dont currently set the datasubject, we need to do so here
  async post (req, res, next) {
    const datasets = await getDatasets()
    const dataset = req.body.dataset
    const { dataSubject } = datasets.get(dataset) || { dataSubject: '' }
    req.body['data-subject'] = dataSubject
    super.post(req, res, next)
  }
}

export default DatasetController
