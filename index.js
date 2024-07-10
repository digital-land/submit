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
import { setupSentry } from './src/serverSetup/sentry.js'

import { dataSubjects } from './src/utils/utils.js'

dotenv.config()

const app = express()

setupMiddlewares(app)
setupSession(app)
setupNunjucks({ app, dataSubjects })
setupRoutes(app)
setupSentry(app)
setupErrorHandlers(app)

app.listen(config.port, () => {
  logger.info(`App listening on all interfaces (0.0.0.0) on port ${config.port}`)
})
