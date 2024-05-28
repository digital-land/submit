import session from 'express-session'
import { createClient } from 'redis'
import RedisStore from 'connect-redis'
import cookieParser from 'cookie-parser'
import config from '../../config/index.js'
import logger from '../utils/logger.js'

export function setupSession (app) {
  app.use(cookieParser())
  let sessionStore
  if (config.redis) {
    const urlPrefix = `redis${config.redis.secure ? 's' : ''}`
    const redisClient = createClient({
      url: `${urlPrefix}://${config.redis.host}:${config.redis.port}`
    })
    redisClient.connect().catch(logger.error)

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
