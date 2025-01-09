// @ts-ignore
import hmpoFormWizard from 'hmpo-form-wizard'
import { logPageView, types } from '../utils/logging.js'
import logger from '../utils/logger.js'
import { datasetSlugToReadableName } from '../utils/datasetSlugToReadableName.js'
const { Controller } = hmpoFormWizard

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 *
 * @typedef {{ ['data-subject']: string, orgName: string, orgId: any, dataset: string, datasetName: string }} DeepLinkInfo
 * @typedef {{ options: { deepLink?: DeepLinkInfo, datasetName?: string, backLinkText?: string, lastPage?: string }}} FormOptions
 */

/**
 * If we arrived at the page via deep from another page, we'll use that page as the back link.
 *
 * @param {string} currentUrl current page URL
 * @param {{ referrer?: string, dataset: string }} deepLinkInfo deep link info from the session
 * @returns {string|undefined} back link URL
 */
function wizardBackLink (currentUrl, deepLinkInfo) {
  if (deepLinkInfo && 'referrer' in deepLinkInfo) {
    const { referrer, dataset } = deepLinkInfo
    if (dataset === 'tree' && currentUrl === '/check/geometry-type') {
      return referrer
    }
    if (dataset !== 'tree' && currentUrl === '/check/upload-method') {
      return referrer
    }
  }

  return undefined
}

class PageController extends Controller {
  checkToolDeepLinkSessionKey = 'check-tool-deep-link'

  /**
   * @returns {{ route: string, backLink?: string }}
   */
  get opts () {
    // @ts-ignore
    return this.options
  }

  /**
   *
   * @param {Request & { sessionID: any }} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  get (req, res, next) {
    logPageView(this.opts.route, req.sessionID)
    super.get(req, res, next)
  }

  /**
   * @param {Request & { sessionModel: Map<string, any>, form: FormOptions }} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  locals (req, res, next) {
    try {
      let backLink
      /** @type {DeepLinkInfo} */
      const deepLinkInfo = req?.sessionModel?.get(this.checkToolDeepLinkSessionKey)
      if (deepLinkInfo) {
        req.form.options.deepLink = deepLinkInfo
        req.form.options.datasetName = deepLinkInfo.datasetName
        backLink = wizardBackLink(req.originalUrl, deepLinkInfo)
      }

      if (backLink) {
        req.form.options.backLinkText = `Back to ${deepLinkInfo.datasetName} overview`
      }

      backLink = backLink ?? this.opts.backLink
      if (backLink) {
        req.form.options.lastPage = backLink
      }
    } catch (e) {
      logger.warn('PageController.locals(): error setting back link', {
        type: types.App,
        errorMessage: e instanceof Error ? e.message : 'cought a non error value',
        errorValue: e
      })
    }

    const dataset = req?.sessionModel?.get('dataset')
    try {
      req.form.options.datasetName = datasetSlugToReadableName(dataset)
    } catch (e) {
      logger.warn(`Failed to get readable dataset name from slug: ${dataset}`)
    }

    super.locals(req, res, next)
  }
}

export default PageController
