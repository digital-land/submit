import { makeDatasetSlugToReadableNameFilter } from '../filters/makeDatasetSlugToReadableNameFilter.js'
import { getDatasetSlugNameMapping } from './datasetteQueries/getDatasetSlugNameMapping.js'
import logger from './logger.js'

const RETRY_INTERVAL_MS = 30_000

let datasetSlugToReadableName = (slug) => slug

const retryUntilLoaded = async () => {
  while (true) {
    try {
      const mapping = await getDatasetSlugNameMapping()
      datasetSlugToReadableName = makeDatasetSlugToReadableNameFilter(mapping)
      return
    } catch (error) {
      logger.warn(`Failed to load dataset mapping, retrying in ${RETRY_INTERVAL_MS / 1000}s:`, error)
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS))
    }
  }
}

const initDatasetSlugToReadableNameFilter = async () => {
  retryUntilLoaded() // keeps trying to update mapping until success
  return datasetSlugToReadableName
}

export {
  datasetSlugToReadableName,
  initDatasetSlugToReadableNameFilter
}
