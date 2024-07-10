import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import logger from '../utils/logger.js'
import hash from '../utils/hasher.js'
import config from '../../config/index.js'

export function setupMiddlewares (app) {
  app.use(async (req, res, next) => {
    logger.info({
      type: 'Request',
      method: req.method,
      endpoint: req.originalUrl,
      message: `${req.method} request made to ${req.originalUrl}`,
      sessionId: await hash(req.sessionID)
    })
    next()
  })

  app.use('/assets', express.static('./node_modules/govuk-frontend/dist/govuk/assets'))
  app.use('/assets', express.static('./node_modules/@x-govuk/govuk-prototype-components/x-govuk'))
  app.use('/public', express.static('./public'))

  app.use(cookieParser())
  app.use(bodyParser.urlencoded({ extended: true }))

  app.use((req, res, next) => {
    const serviceDown = config.maintenance.serviceUnavailable || false
    if (serviceDown) {
      res.status(503).render('errorPages/503', { upTime: config.maintenance.upTime })
    } else {
      next()
    }
  })
}
