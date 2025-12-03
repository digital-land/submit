import datasette from '../../services/datasette.js'
import logger from '../logger.js'
import config from '../../../config/index.js'

export const fetchDatasetsRequiredForLocalAuthority = async () => {
  const sql = 'SELECT DISTINCT dataset, provision_reason FROM provision'

  try {
    const response = await datasette.runQuery(sql)

    const filteredProvisions = response.formattedData.filter(p =>
      // Use config-driven provision reasons
      config.provisionReasons.includes(p.provision_reason)
    )

    let availableDatasets
    // Feature flag provisionBasedDatasets to toggle between using provisions or hard coded datasets
    if (config.features.provisionBasedDatasets.enabled) {
      logger.info('fetchDatasetsForLocalAuthority: Using filtered provisions for available datasets in development/local environment')
      availableDatasets = filteredProvisions.map(p => p.dataset)
    } else {
      logger.info('fetchDatasetsForLocalAuthority: Using hard coded datasets for available datasets')
      availableDatasets = Object.keys(config.datasetsConfig)
    }

    return availableDatasets
  } catch (error) {
    logger.warn(`fetchDatasetsForLocalAuthority: Error fetching dataset info: ${error.message}`, error)
    throw error
  }
}

export default fetchDatasetsRequiredForLocalAuthority
