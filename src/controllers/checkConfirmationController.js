import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import { endpointAlreadyCollectedForDataset } from '../utils/datasetteQueries/endpointAlreadyCollected.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

class CheckConfirmationController extends PageController {
  async locals (req, res, next) {
    const isUrlCheck = req.sessionModel.get('upload-method') === 'url'
    if (isUrlCheck) {
      const requestId = req.sessionModel.get('request_id')
      req.form.options.requestId = requestId
      try {
        const requestData = await getRequestData(requestId)
        const params = requestData.getParams() ?? {}
        if (params.dataset) {
          req.sessionModel.set('dataset', params.dataset)
        }
        if (params.organisationName) {
          req.sessionModel.set('orgId', params.organisationName)
        }
        req.form.options.alreadyCollectingEndpoint = await endpointAlreadyCollectedForDataset({
          endpointUrl: params.url,
          dataset: params.dataset
        })
      } catch (error) {
        logger.warn('CheckConfirmationController: could not check whether endpoint is already collected', {
          type: types.App,
          requestId,
          errorMessage: error.message
        })
      }

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
