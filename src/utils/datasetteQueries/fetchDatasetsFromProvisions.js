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
    // Test environment currently uses fall back
    if (config.environment === 'development' || config.environment === 'local') {
      availableDatasets = filteredProvisions.map(p => p.dataset)
    } else {
      availableDatasets = Object.keys(config.datasetsConfig)
    }

    return availableDatasets
  } catch (error) {
    logger.warn(`fetchDatasetsForLocalAuthority: Error fetching dataset info: ${error.message}`, error)
    throw error
  }
}

export default fetchDatasetsRequiredForLocalAuthority
