import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { render, EmptyParams, ErrorParams } from '../routes/schemas.js'

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

    err.template = err.template || (err.status && `errorPages/${err.status}`) || 'errorPages/500'

    if (err.redirect) {
      return res.redirect(err.redirect)
    }

    err.status = err.status || 500
    try {
      render(res.status(err.status), err.template, ErrorParams, { err })
    } catch (e) {
      render(res.status(err.status), 'errorPages/500', ErrorParams, { err })
    }
  })

  app.use((req, res, next) => {
    logger.info({
      type: types.Response,
      method: req.method,
      endpoint: req.originalUrl,
      message: 'not found'
    })
    render(res.status(404), 'errorPages/404', EmptyParams, {})
  })
}
