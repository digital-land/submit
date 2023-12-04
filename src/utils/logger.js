import { createLogger, format, transports } from 'winston'

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  defaultMeta: { service: 'lpa-data-validation-frontend' },
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'combined.log' })
  ]
})

export default logger
