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
          req.form.options.alreadyCollectingEndpoint = await endpointAlreadyCollectedForDataset({
            endpointUrl: params.url,
            dataset: params.dataset,
            organisation: params.organisationName
          })
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
