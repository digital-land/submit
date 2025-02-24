import { makeDatasetSlugToReadableNameFilter } from '../filters/makeDatasetSlugToReadableNameFilter.js'
import { getDatasetSlugNameMapping } from './datasetteQueries/getDatasetSlugNameMapping.js'

let datasetSlugToReadableName = (slug) => slug

const initDatasetSlugToReadableNameFilter = async () => {
  try {
    const mapping = await getDatasetSlugNameMapping()
    datasetSlugToReadableName = makeDatasetSlugToReadableNameFilter(mapping)
  } catch (error) {
    console.error('Failed to load dataset mapping:', error)
    datasetSlugToReadableName = (slug) => slug // Fallback to using the slug as-is
  }
}

export {
  datasetSlugToReadableName,
  initDatasetSlugToReadableNameFilter
}
