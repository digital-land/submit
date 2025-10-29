import PageController from './pageController.js'

import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { getDatasets } from '../utils/utils.js'
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
  async get (req, res, next) {
    // if the query params don't contain what we need, redirect to the "get started" page,
    // this way the user can still proceed (but need to fill the dataset+orgName themselves)
    const { dataset, orgName, orgId } = req.query
    const datasets = await getDatasets()

    if (!dataset || !orgName || !datasets.has(dataset)) {
      logger.info('EndpointSubmissionFormDeepLinkController.get(): invalid params for deep link, redirecting to landing page',
        { type: types.App, query: req.query })
      return res.redirect('/')
    }

    const datasetInfo = datasets.get(dataset) ?? { dataSubject: '', requiresGeometryTypeSelection: false }
    req.sessionModel.set('dataset', dataset)
    req.sessionModel.set('lpa', orgName)
    req.sessionModel.set('orgId', orgId)
    const sessionData = { lpa: orgName, dataset, orgId, datasetName: datasetInfo.text }
    maybeSetReferrer(req, sessionData)
    req.sessionModel.set(this.sessionKey, sessionData)

    super.post(req, res, next)
  }
}

export default EndpointSubmissionFormDeepLinkController
