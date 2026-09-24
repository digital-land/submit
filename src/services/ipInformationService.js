import * as Sentry from '@sentry/node'
import { createHash, randomUUID } from 'node:crypto'
import config from '../../config/index.js'
import notifyClient from './mailClient.js'
import { getRedisClient } from '../utils/redisLoader.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

// Only diagnostic identifiers are safe to log, never the Axios error/response:
// those can include credentials, recipient addresses and private email content.
const diagnosticIdentifier = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(value)

// A shared reservation prevents concurrent requests across application instances.
// Hash the recipient so email addresses are not stored in Redis keys.
const updateReservation = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('SET', KEYS[1], 'sent', 'EX', 300)
  end
  return 0
`
const releaseReservation = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`

export async function sendIpInformation (email) {
  if (!process.env.GOVUK_NOTIFY_API_KEY) throw new Error('Notify is not configured')
  const redis = await getRedisClient()
  if (!redis) throw new Error('Email reservation is unavailable')
  const recipientHash = createHash('sha256').update(email.toLowerCase()).digest('hex')
  const key = `ip-information:${config.environment}:${recipientHash}`
  const token = randomUUID()
  const reserved = await redis.set(key, token, { NX: true, EX: 300 })
  if (!reserved) {
    if (await redis.get(key) === 'sent') return
    throw new Error('An email request is already in progress')
  }

  try {
    await notifyClient.sendEmail(config.email.templates.IpInformationTemplateId, email, {})
  } catch (error) {
    Sentry.metrics.count('notify.email_send_failed', 1)
    const status = error.response?.status
    const errors = error.response?.data?.errors
    logger.error('Notify email send failed', {
      type: types.External,
      event: 'notify.email_send_failed',
      ...(Number.isInteger(status) && status >= 100 && status <= 599 ? { httpStatus: status } : {}),
      ...(diagnosticIdentifier(error.code) ? { networkCode: error.code } : {}),
      ...(Array.isArray(errors)
        ? { errorTypes: [...new Set(errors.map(item => item?.error).filter(diagnosticIdentifier))].join(', ') }
        : {})
    })
    // logger.error also forwards these safe fields to Sentry Logs.
    // A rejected request can be retried. For an ambiguous network failure, retain
    // the reservation until expiry: Notify may already have accepted the email.
    if (error.response?.status >= 400 && error.response.status < 500) {
      await redis.eval(releaseReservation, { keys: [key], arguments: [token] })
    }
    throw new Error('Notify could not send the information')
  }
  Sentry.metrics.count('notify.email_send_succeeded', 1)
  // Notify accepted the email. Do not report a sending failure if Redis drops out.
  await redis.eval(updateReservation, { keys: [key], arguments: [token] }).catch(() => {})
}
