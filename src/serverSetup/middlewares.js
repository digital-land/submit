import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import hash from '../utils/hasher.js'
import config from '../../config/index.js'
import { preventIndexing } from '../middleware/common.middleware.js'
import { MiddlewareError, errorTemplateContext } from '../utils/errors.js'

export function setupMiddlewares (app) {
  app.use((req, res, next) => {
    const obj = {
      type: types.Request,
      method: req.method,
      endpoint: req.originalUrl,
      message: '◦' // we need to put something here or watson will use an obj as the message
    }
    if (req.sessionID) {
      obj.sessionId = hash(req.sessionID)
    }
    logger.info(obj)
    next()
  })

  app.use('/assets', express.static('./node_modules/govuk-frontend/dist/govuk/assets'))
  app.use('/assets', express.static('./node_modules/@x-govuk/govuk-prototype-components/x-govuk'))
  app.use('/public', express.static('./public'))
  app.use('/robots.txt', express.static('./robots.txt'))

  app.use(cookieParser())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(preventIndexing)

  app.use((req, res, next) => {
    const serviceDown = config.maintenance.serviceUnavailable || false
    if (serviceDown) {
      const err = new MiddlewareError('Service unavailable', 503)
      res.status(err.statusCode).render(err.template, { ...errorTemplateContext(), err, uptime: config.maintenance.upTime })
    } else {
      next()
    }
  })
}
