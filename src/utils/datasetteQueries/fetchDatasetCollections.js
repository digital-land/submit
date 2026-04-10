import datasette from '../../services/datasette.js'
import logger from '../logger.js'

// Temporary utility to get dataset collection slug-name mapping from Datasette, likely/hopefully don't need collection names in the future.
export const getDatasetCollectionSlugNameMapping = async (nameMap) => {
  try {
    const datasets = Object.keys(nameMap).map(dataset => `'${dataset}'`).join(',')
    const datasetSlugNameTable = await datasette.runQuery(
      `SELECT dataset, collection FROM dataset WHERE dataset IN (${datasets})`
    )

    const datasetMapping = new Map()
    datasetSlugNameTable.formattedData.forEach(row => {
      datasetMapping.set(row.dataset, row.collection)
    })
    return datasetMapping
  } catch (error) {
    logger.error(`Failed to fetch dataset=>collection mapping: ${error.message}`)
    return null
  }
}
