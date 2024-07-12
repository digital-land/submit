import { createLogger, format, transports } from 'winston'
import config from '../../config'

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
