import PageController from './pageController.js'

import { datasets } from '../utils/utils.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import * as v from 'valibot'
import { NonEmptyString } from '../routes/schemas.js'

const QueryParams = v.object({
  dataset: NonEmptyString,
  orgName: NonEmptyString
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
class DeepLinkController extends PageController {
  get (req, res, next) {
    // if the query params don't contain what we need, redirect to the "get started" page,
    // this way the user can still proceed (but need to fill the dataset+orgName themselves)
    const { dataset, orgName } = req.query
    const validationResult = v.safeParse(QueryParams, req.query)
    if (!(validationResult.success && datasets.has(dataset))) {
      logger.info('DeepLinkController.get(): invalid params for deep link, redirecting to start page',
        { type: types.App, query: req.query })
      return res.redirect('/check')
    }

    req.sessionModel.set('dataset', dataset)
    const datasetInfo = datasets.get(dataset) ?? { dataSubject: '', requiresGeometryTypeSelection: false }
    req.sessionModel.set('data-subject', datasetInfo.dataSubject)
    const sessionData = { 'data-subject': datasetInfo.dataSubject, orgName, dataset, datasetName: datasetInfo.text }
    maybeSetReferrer(req, sessionData)
    req.sessionModel.set(this.checkToolDeepLinkSessionKey, sessionData)

    this.#addHistoryStep(req, '/check/dataset')

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

export default DeepLinkController
