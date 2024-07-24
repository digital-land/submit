import session from 'express-session'
import { createClient } from 'redis'
import RedisStore from 'connect-redis'
import cookieParser from 'cookie-parser'
import config from '../../config/index.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

export function setupSession (app) {
  app.use(cookieParser())
  let sessionStore
  if ('redis' in config) {
    const urlPrefix = `redis${config.redis.secure ? 's' : ''}`
    const url = `${urlPrefix}://${config.redis.host}:${config.redis.port}`
    const redisClient = createClient({ url })
    const errorHandler = (error) => {
      logger.info(`session/setupSession: failed to connect to ${url}`, { type: types.AppLifecycle })
      logger.warn('session/setupSession: redis connection error', { type: types.External, error })
    }
    redisClient.connect().catch(errorHandler)

    sessionStore = new RedisStore({
      client: redisClient
    })
  }
  app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  }))
}
