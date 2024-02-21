import logger from '../utils/logger.js'
import hash from '../utils/hasher.js'

const logPageView = async (route, sessionID) => {
    logger.info({
        type: 'PageView',
        pageRoute: route,
        message: `page view occurred for page: ${route}`,
        sessionId: await hash(sessionID)
    })
}

export {logPageView}