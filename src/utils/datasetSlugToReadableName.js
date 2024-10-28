import { makeDatasetSlugToReadableNameFilter } from '../filters/makeDatasetSlugToReadableNameFilter.js'
import { getDatasetSlugNameMapping } from './datasetteQueries/getDatasetSlugNameMapping.js'

const datasetSlugToReadableName = makeDatasetSlugToReadableNameFilter(await getDatasetSlugNameMapping())

export default datasetSlugToReadableName
