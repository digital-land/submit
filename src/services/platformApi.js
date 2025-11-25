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
   * Fetches entities from the Platform API /entity.json endpoint
   *
   * @param {Object} params - Query parameters
   * @param {string} params.organisation_entity - The organisation entity ID
   * @param {string} params.dataset - The dataset name
   * @param {number} [params.limit] - Maximum number of results
   * @param {number} [params.offset] - Number of results to skip
   * @param {string} [params.quality] - The quality level (e.g., 'authoritative', 'some')
   * @returns {Promise<{data: object, formattedData: object[]}>} - A promise that resolves to formatted entity data
   * @throws {Error} If the query fails or there is an error communicating with the Platform API
   */
  fetchEntities: async (params) => {
    if (!params.organisation_entity && !params.dataset) {
      throw new Error('organisation_entity or dataset are required parameters')
    }
    const queryParams = new URLSearchParams()

    if (params.organisation_entity) queryParams.append('organisation_entity', params.organisation_entity)
    if (params.dataset) queryParams.append('dataset', params.dataset)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.offset) queryParams.append('offset', params.offset)
    if (params.quality) queryParams.append('quality', params.quality)

    const url = `${config.mainWebsiteUrl}/entity.json?${queryParams.toString()}`

    const data = await queryPlatformAPI(url, params)

    // Platform API returns { entities: [...] }
    const entities = data?.entities || []

    return {
      data,
      formattedData: entities
    }
  },

  /**
   * Fetches datasets from the Platform API /dataset.json endpoint
   *
   * @param {Object} params - Query params
   * @param {string} [params.organisation_entity] - The organisation entity ID
   * @param {string} [params.dataset] - The dataset name
   * @param {number} [params.limit] - Maximum number of results
   * @param {number} [params.offset] - Number of results to skip
   * @param {string} [params.quality] - The quality level (e.g., 'authoritative', 'some')
   * @returns {Promise<{data: object, formattedData: object[]}>} - A promise that resolves to formatted dataset data
   * @throws {Error} If the query fails or there is an error communicating with the Platform API
   */
  fetchDatasets: async (params) => {
    const queryParams = new URLSearchParams()

    if (params.dataset) queryParams.append('dataset', params.dataset)

    const url = `${config.mainWebsiteUrl}/dataset.json?${queryParams.toString()}`

    const data = await queryPlatformAPI(url, params)

    // Platform API returns { datasets: [...] }
    const datasets = data?.datasets || []

    return {
      data,
      formattedData: datasets
    }
  }

}

/**
 * Generic query function for Platform API
 *
 * @param {string} url - The full URL to query
 * @param {Object} params - Query parameters for logging
 * @returns {Promise<Object>} - Raw response data from Platform API
 */
async function queryPlatformAPI (url, params = {}) {
  try {
    logger.debug({ message: 'Platform API request', type: types.DataFetch, url, params })
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': config.checkService.userAgentInternal
      }
    })

    return response.data
  } catch (error) {
    logger.warn({
      message: `queryPlatformAPI(): ${error.message}`,
      type: types.External,
      params,
      platformUrl: config.mainWebsiteUrl,
      url
    })
    throw error
  }
}
