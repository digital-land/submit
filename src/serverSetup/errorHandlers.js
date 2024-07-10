import logger from '../utils/logger.js'

export function setupErrorHandlers (app) {
  app.use((err, req, res, next) => {
    logger.error({
      type: 'Request error',
      method: req.method,
      endpoint: req.originalUrl,
      message: `${req.method} request made to ${req.originalUrl} but an error occurred`,
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
      res.status(err.status).render(err.template, { err })
    } catch (e) {
      res.status(err.status).render('errorPages/500', { err })
    }
  })

  app.use((req, res, next) => {
    logger.info({
      type: 'File not found',
      method: req.method,
      endpoint: req.originalUrl,
      message: `${req.method} request made to ${req.originalUrl} but the file/endpoint was not found`
    })
    res.status(404).render('errorPages/404')
  })
}
