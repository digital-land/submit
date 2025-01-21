import PageController from './pageController.js'

import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

/**
 * Potentially updates sessionData with 'referrer'
 *
 * @param req
 * @param sessionData
 */
function maybeSetReferrer (req, sessionData) {
  if (req.headers.referer) {
    try {
      /* eslint-disable-next-line no-new */
      new URL(req.headers.referer)
      sessionData.referrer = req.headers.referer
    } catch (err) {
      logger.info('DeepLinkController.get(): invalid referrer URL, skipping', {
        type: types.App,
        referrer: req.headers.referer,
        errorMessage: err.message
      })
    }
  }
}

/**
 * Handles deep links in the Check Tool.
 *
 * It is meant to extract required params from query params
 * and partially pre-populate the session with them,
 * then redirect the user to the "next" page in the wizard
 */
class EndpointSubmissionFormDeepLinkController extends PageController {
  get (req, res, next) {
    // if the query params don't contain what we need, redirect to the "get started" page,
    // this way the user can still proceed (but need to fill the dataset+orgName themselves)
    const { dataset, orgName } = req.query

    if (!dataset || !orgName) {
      const error = new Error('Missing dataset or orgName in query params')
      error.status = 400
      return next(error)
    }

    req.sessionModel.set('dataset', dataset)
    req.sessionModel.set('lpa', orgName)
    const sessionData = { lpa: orgName, dataset }
    maybeSetReferrer(req, sessionData)
    req.sessionModel.set(this.sessionKey, sessionData)

    super.post(req, res, next)
  }
}

export default EndpointSubmissionFormDeepLinkController
