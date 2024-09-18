import logger from '../utils/logger.js'
import hash from '../utils/hasher.js'

/**
 * Types of logging events.
 *
 * Use as a value for 'type' entry of {@link https://github.com/winstonjs/winston?tab=readme-ov-file#streams-objectmode-and-info-objects|`info` objects}
 */
const types = {
  PageView: 'PageView',
  Request: 'Request',
  Response: 'Response',
  AppLifecycle: 'AppLifecycle',
  App: 'App',
  DataValidation: 'DataValidation',
  DataFetch: 'DataFetch',
  External: 'External'
}

const logPageView = (route, sessionID) => {
  logger.info({
    type: types.PageView,
    endpoint: route,
    message: 'page view',
    sessionId: hash(sessionID)
  })
}

export { logPageView, types }
