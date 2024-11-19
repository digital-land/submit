import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

export function setupErrorHandlers (app) {
  app.use((err, req, res, next) => {
    logger.error({
      type: types.Response,
      method: req.method,
      endpoint: req.originalUrl,
      message: 'error occurred',
      error: JSON.stringify(err),
      errorMessage: err.message,
      errorStack: err.stack
    })

    if (res.headersSent) {
      return next(err)
    }

    err.template = err.template || (err.status && `errorPages/${err.status}`) || 'errorPages/500'

    if (err.redirect) {
      return res.redirect(err.redirect)
    }

    err.status = err.status || 500
    try {
      res.status(err.status).render(err.template, { err })
    } catch (e) {
      res.status(err.status).render('errorPages/500', { err })
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
    res.status(404).render('errorPages/404')
  })
}
