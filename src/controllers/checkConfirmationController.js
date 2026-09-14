import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import { endpointAlreadyCollectedForDataset } from '../utils/datasetteQueries/endpointAlreadyCollected.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

class CheckConfirmationController extends PageController {
  async locals (req, res, next) {
    const isUrlCheck = req.sessionModel.get('upload-method') === 'url'
    const requestId = req.sessionModel.get('request_id')
    req.form.options.datasetsInResource = []
    if (isUrlCheck) req.form.options.requestId = requestId
    if (requestId) {
      try {
        const requestData = await getRequestData(requestId)
        req.form.options.datasetsInResource = requestData.getDatasetsInResource()
        const params = requestData.getParams() ?? {}
        if (params.dataset) {
          req.sessionModel.set('dataset', params.dataset)
        }
        if (params.organisationName) {
          req.sessionModel.set('orgId', params.organisationName)
        }
        if (isUrlCheck) {
          const detected = req.form.options.datasetsInResource
          const datasets = detected.length ? detected : [params.dataset]
          const collected = await Promise.all(datasets.map(dataset => endpointAlreadyCollectedForDataset({
            endpointUrl: params.url,
            dataset,
            organisation: params.organisationName
          })))
          req.form.options.alreadyCollectingEndpoint = collected.every(Boolean)
        }
      } catch (error) {
        logger.warn('CheckConfirmationController: could not load check confirmation context', {
          type: types.App,
          requestId,
          errorMessage: error.message
        })
      }
    }
    if (isUrlCheck) {
      if (req.form.options.alreadyCollectingEndpoint) {
        delete req.session.checkRequestId
      } else {
        req.session.checkRequestId = requestId
      }
    }
    super.locals(req, res, next)
  }
}

export default CheckConfirmationController
