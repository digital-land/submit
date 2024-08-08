'use strict'

import express from 'express'
import dotenv from 'dotenv'
import logger from './src/utils/logger.js'
import { types } from './src/utils/logging.js'
import config from './config/index.js'

import { setupMiddlewares } from './src/serverSetup/middlewares.js'
import { setupRoutes } from './src/serverSetup/routes.js'
import { setupErrorHandlers } from './src/serverSetup/errorHandlers.js'
import { setupSession } from './src/serverSetup/session.js'
import { setupNunjucks } from './src/serverSetup/nunjucks.js'
import { setupSentry } from './src/serverSetup/sentry.js'
import { getDatasetSlugNameMapping } from './src/utils/datasetteQueries/getDatasetSlugNameMapping.js'

dotenv.config()

const app = express()

setupMiddlewares(app)
await setupSession(app)
setupNunjucks({
  app,
  datasetNameMapping: await getDatasetSlugNameMapping()
})
setupRoutes(app)
setupSentry(app)
setupErrorHandlers(app)

app.listen(config.port, () => {
  logger.info({
    message: `listening on all interfaces (0.0.0.0) on port ${config.port}`,
    type: types.AppLifecycle
  })
})
