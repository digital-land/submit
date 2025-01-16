import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { MiddlewareError, errorTemplateContext } from '../utils/errors.js'

const requestIdKey = Symbol.for('reqId')

export function setupErrorHandlers (app) {
  const errContext = errorTemplateContext()
  app.use((err, req, res, next) => {
    logger.error({
      type: types.Response,
      method: req.method,
      endpoint: req.originalUrl,
      message: 'error occurred',
      error: JSON.stringify(err),
      errorMessage: err.message,
      errorStack: err.stack,
      reqId: req[requestIdKey]
    })

    if (res.headersSent) {
      return next(err)
    }

    if (err.redirect) {
      return res.redirect(err.redirect)
    }

    const middlewareError = err instanceof MiddlewareError ? err : new MiddlewareError('Internal server error', 500, { cause: err })
    try {
      res.status(middlewareError.statusCode).render(middlewareError.template, { ...errContext, err: middlewareError })
    } catch (e) {
      logger.error('Failed to render error page.', {
        type: types.Response, errorMessage: e.message, errorStack: e.stack, originalError: err.message, endpoint: req.originalUrl
      })
      const renderError = new MiddlewareError('Failed to render error page', 500, { cause: e })
      res.status(500).render('errorPages/error.njk', { ...errContext, err: renderError })
    }
  })

  app.use((req, res, next) => {
    if (res.headersSent) {
      return next()
    }
    logger.info({
      type: types.Response,
      method: req.method,
      endpoint: req.originalUrl,
      message: 'not found'
    })
    const err = new MiddlewareError('Not found', 404)
    res.status(err.statusCode).render(err.template, { ...errContext, err })
  })
}
