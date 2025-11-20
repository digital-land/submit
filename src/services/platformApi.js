import axios from 'axios'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import config from '../../config/index.js'

/**
 * Service for querying the Platform API (mainWebsiteUrl)
 * Unlike Datasette which uses SQL queries, this uses REST endpoints with query parameters
 */
export default {
  /**
   * Fetches entities from the Platform API
   *
   * @param {Object} params - Query parameters
   * @param {string} params.organisation_entity - The organisation entity ID
   * @param {string} params.dataset - The dataset name
   * @param {number} [params.limit] - Maximum number of results
   * @param {number} [params.offset] - Number of results to skip
   * @returns {Promise<{data: object, formattedData: object[]}>} - A promise that resolves to formatted entity data
   * @throws {Error} If the query fails or there is an error communicating with the Platform API
   */
  fetchEntities: async (params) => {
    if (!params.organisation_entity || !params.dataset) {
      throw new Error('organisation_entity or dataset are required parameters')  
    }
    const queryParams = new URLSearchParams()

    if (params.organisation_entity) queryParams.append('organisation_entity', params.organisation_entity)
    if (params.dataset) queryParams.append('dataset', params.dataset)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.offset) queryParams.append('offset', params.offset)

    const url = `${config.mainWebsiteUrl}/entity.json?${queryParams.toString()}`

    try {
      logger.debug({ message: 'Platform API request', type: types.DataFetch, url, params })
      const response = await axios.get(url)

      // Platform API returns { entities: [...] }
      const entities = response.data?.entities || []

      return {
        data: response.data,
        formattedData: entities
      }
    } catch (error) {
      logger.warn({
        message: `platformApi.fetchEntities(): ${error.message}`,
        type: types.App,
        params,
        platformUrl: config.mainWebsiteUrl
      })
      throw error
    }
  }
}
