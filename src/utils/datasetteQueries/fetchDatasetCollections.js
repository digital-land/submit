import datasette from '../../services/datasette.js'
import logger from '../logger.js'
import { types } from '../logging.js'

// Temporary utility to get dataset collection slug-name mapping from Datasette, likely/hopefully don't need collection names in the future.
export const getDatasetCollectionSlugNameMapping = async (nameMap) => {
  try {
    const datasets = Object.keys(nameMap).map(dataset => `'${dataset}'`).join(',')
    const datasetSlugNameTable = await datasette.runQuery(
      `SELECT dataset, collection FROM dataset WHERE dataset IN (${datasets})`
    )

    // If no dataset table exists for a dataset, remove from datasetSlugNameMapping
    const validDatasets = []

    for (const row of datasetSlugNameTable.formattedData) {
      try {
        // Test if the dataset table exists by running a simple query, for example datasets such as development-plan-geography exist in dataset, but no table created yet in datasette
        await datasette.runQuery('SELECT 1 FROM entity LIMIT 1', row.dataset)
        validDatasets.push(row)
      } catch (error) {
        logger.warn(`Dataset table '${row.dataset}' does not exist, removing from mapping`, {
          dataset: row.dataset,
          errorMessage: error.message,
          type: types.DataFetch
        })
        // Don't add to validDatasets
      }
    }

    const datasetMapping = new Map()
    validDatasets.forEach(row => {
      datasetMapping.set(row.dataset, row.collection)
    })
    return datasetMapping
  } catch (error) {
    logger.error(`Failed to fetch dataset=>collection mapping: ${error.message}`)
    return null
  }
}
