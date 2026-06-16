import { createLogger, format, transports, Transport } from 'winston'
import * as Sentry from '@sentry/node'
import config from '../../config/index.js'

/* eslint-disable no-unused-vars */
const ignoreAssetRequests = format((info, opts) => {
  const { endpoint } = info
  if (!endpoint) { return info }
  if (endpoint.match(/^\/(assets|public)\/.*/)) { return false }
  return info
})

class SentryTransport extends Transport {
  log (info, callback) {
    if (info.level === 'warn') Sentry.logger.warn(info.message, info)
    else if (info.level === 'error') Sentry.logger.error(info.message, info)
    callback()
  }
}

const appTransports = () => [
  new transports.Console(),
  new transports.File({ filename: 'combined.log' }),
  new SentryTransport({ level: 'warn' })
]

const testTransports = () => [
  new transports.Console({ level: 'error' })
]

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  defaultMeta: { service: 'lpa-data-validation-frontend' },
  transports: config.environment === 'test' ? testTransports() : appTransports()
})

export default logger
