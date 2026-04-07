'use strict'

import PageController from './pageController.js'
import logger from '../utils/logger.js'

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
    } catch (error) {
      logger.error('Failed to load dataset subjects:', error)
      req.form.options.datasetItems = []
    }
    super.locals(req, res, next)
  }

  // we shouldn't need this here but as we dont currently set the datasubject, we need to do so here
  async post (req, res, next) {
    try {
      const datasets = await getDatasets()
      const dataset = req.body.dataset
      const dataSet = datasets.get(dataset) || { dataSubject: '' }
      const { dataSubject } = dataSet
      req.body['data-subject'] = dataSubject
      // Set in session to avoid async next routing issues
      const requiresGeometry = dataSet?.requiresGeometryTypeSelection || false
      req.sessionModel.set('requiresGeometryTypeSelection', requiresGeometry)
    } catch (error) {
      logger.error('DatasetController.post: failed to set data-subject:', error)
      req.body['data-subject'] = ''
      req.sessionModel.set('requiresGeometryTypeSelection', false)
    }
    super.post(req, res, next)
  }
}

export default DatasetController
