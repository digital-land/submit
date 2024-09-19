import { createLogger, format, transports } from 'winston'
import config from '../../config/index.js'

/* eslint-disable no-unused-vars */
const ignoreAssetRequests = format((info, opts) => {
  const { endpoint } = info
  if (!endpoint) { return info }
  if (endpoint.match(/^\/(assets|public)\/.*/)) { return false }
  return info
})

const appTransports = () => [
  new transports.Console(),
  new transports.File({ filename: 'combined.log' })
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
