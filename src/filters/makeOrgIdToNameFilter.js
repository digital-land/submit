import logger from '../utils/logger.js'

export const makeOrgIdToNameFilter = (orgNameMapping) => {
  return (orgId) => {
    const name = orgNameMapping.get(orgId)
    if (!name) {
      logger.debug(`can't find a name for org ${orgId}`)
      return orgId
    }
    return name
  }
}
