import PageController from './pageController.js'

import { getDatasets } from '../utils/utils.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import * as v from 'valibot'
import { NonEmptyString } from '../routes/schemas.js'
import { requiresGeometryTypeToBeSelectedViaDeepLink } from './datasetController.js'

const QueryParams = v.object({
  dataset: NonEmptyString,
  orgName: NonEmptyString,
  orgId: NonEmptyString
})

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
class CheckDeepLinkController extends PageController {
  async get (req, res, next) {
    // if the query params don't contain what we need, redirect to the "get started" page,
    // this way the user can still proceed (but need to fill the dataset+orgName themselves)
    const { dataset, orgName, orgId } = req.query
    let datasets = null
    try {
      datasets = await getDatasets()
    } catch (error) {
      logger.error('getDatasets Error', error)
      return res.redirect('/')
    }

    const validationResult = v.safeParse(QueryParams, req.query)
    if (!(validationResult.success && datasets.has(dataset))) {
      logger.info('DeepLinkController.get(): invalid params for deep link, redirecting to landing page',
        { type: types.App, query: req.query })
      return res.redirect('/')
    }

    req.sessionModel.set('dataset', dataset)
    const datasetInfo = datasets.get(dataset) ?? { dataSubject: '', requiresGeometryTypeSelection: false }
    req.sessionModel.set('data-subject', datasetInfo.dataSubject)
    const sessionData = { 'data-subject': datasetInfo.dataSubject, orgName, orgId, dataset, datasetName: datasetInfo.text }
    maybeSetReferrer(req, sessionData)
    req.sessionModel.set(this.sessionKey, sessionData)

    this.#addHistoryStep(req, '/check/dataset')

    // Pre-calculate geometry requirement to avoid async timing issues in form wizard async conditional routing
    const requiresGeometry = await requiresGeometryTypeToBeSelectedViaDeepLink(req)
    req.sessionModel.set('requiresGeometryTypeSelection', requiresGeometry)

    super.post(req, res, next)
  }

  #addHistoryStep (req, path, next) {
    const newItem = {
      path,
      wizard: 'check-wizard',
      fields: ['dataset', 'data-subject'],
      skip: false,
      continueOnEdit: false
    }

    const history = req.journeyModel.get('history') || []
    history.push(newItem)
    req.journeyModel.set('history', history)
  }
}

export default CheckDeepLinkController
