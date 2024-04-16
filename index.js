'use strict'

import express from 'express'
import dotenv from 'dotenv'
import logger from './src/utils/logger.js'
import config from './config/index.js'

import { setupMiddlewares } from './middlewares.js'
import { setupRoutes } from './routes.js'
import { setupErrorHandlers } from './errorHandlers.js'
import { setupSession } from './session.js'
import { setupNunjucks } from './nunjucks.js'

dotenv.config()

const app = express()

setupMiddlewares(app)
setupSession(app)
setupNunjucks(app)
setupRoutes(app)
setupErrorHandlers(app)

app.listen(config.port, () => {
  logger.info('App listening on http://localhost::port', { port: config.port })
})
