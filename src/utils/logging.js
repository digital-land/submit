import logger from '../utils/logger.js'
import hash from '../utils/hasher.js'

const logPageView = (route, sessionID) => {
  return hash(sessionID).then(hashedSessionID => {
    logger.info({
      type: 'PageView',
      pageRoute: route,
      message: `page view occurred for page: ${route}`,
      sessionId: hashedSessionID
    })
  })
}

export { logPageView }
