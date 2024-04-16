'use strict'

import express from 'express'
import dotenv from 'dotenv'
import logger from './src/utils/logger.js'
import config from './config/index.js'

import { setupMiddlewares } from './src/serverSetup/middlewares.js'
import { setupRoutes } from './src/serverSetup/routes.js'
import { setupErrorHandlers } from './src/serverSetup/errorHandlers.js'
import { setupSession } from './src/serverSetup/session.js'
import { setupNunjucks } from './src/serverSetup/nunjucks.js'

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
