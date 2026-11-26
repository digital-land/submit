import session from 'express-session'
import { createClient } from 'redis'
import RedisStore from 'connect-redis'
import config from '../../config/index.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

export async function setupSession (app) {
  const secureCookie = config.secureCookies
  const deployed = ['production', 'staging', 'development'].includes(config.environment)
  if (deployed && (!process.env.SESSION_SECRET || ['keyboard cat', 'your_secret'].includes(process.env.SESSION_SECRET))) throw new Error('SESSION_SECRET must be configured')
  if (deployed && !config.redis) throw new Error('Redis must be configured for sessions')
  let sessionStore
  if (config.redis) {
    const urlPrefix = `redis${config.redis.secure ? 's' : ''}`
    const url = `${urlPrefix}://${config.redis.host}:${config.redis.port}`
    let established = false
    const redisClient = createClient({ url, disableOfflineQueue: true, socket: { connectTimeout: 5000, reconnectStrategy: retries => established || retries < 3 ? Math.min(500 * (retries + 1), 5000) : false } })
    redisClient.on('ready', () => { established = true })
    redisClient.on('error', () => logger.warn('Session Redis connection unavailable', { type: types.External }))
    await redisClient.connect()
    sessionStore = new RedisStore({ client: redisClient })
  }
  app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: secureCookie,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: 'lax'
    }
  }))
}
