import session from 'express-session'
import { createClient } from 'redis'
import RedisStore from 'connect-redis'
import cookieParser from 'cookie-parser'
import config from './config/index.js'
import logger from './src/utils/logger.js'

export function setupSession(app) {
  app.use(cookieParser())

  const redisClient = createClient({
    host: config.redis.host,
    port: config.redis.port
  })
  redisClient.connect().catch(logger.error)

  const redisStore = new RedisStore({
    client: redisClient
  })

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: redisStore,
    cookie: {
      secure: config.environment === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  }))
}