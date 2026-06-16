import { makeOrgIdToNameFilter } from '../filters/makeOrgIdToNameFilter.js'
import { getOrganisationNameMapping } from './datasetteQueries/getOrganisationNameMapping.js'
import logger from './logger.js'

const RETRY_INTERVAL_MS = 30_000

let orgIdToName = (orgId) => orgId

const retryUntilLoaded = async () => {
  while (true) {
    try {
      const mapping = await getOrganisationNameMapping()
      orgIdToName = makeOrgIdToNameFilter(mapping)
      return
    } catch (error) {
      logger.warn(`Failed to load organisation name mapping, retrying in ${RETRY_INTERVAL_MS / 1000}s:`, error)
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS))
    }
  }
}

const initOrgIdToNameFilter = async () => {
  retryUntilLoaded()
  return orgIdToName
}

export {
  orgIdToName,
  initOrgIdToNameFilter
}
