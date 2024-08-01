import axios from 'axios'
import logger from '../utils/logger.js'

const datasetteUrl = 'https://datasette.planning.data.gov.uk'
const database = 'digital-land'

export default {
  runQuery: async (query) => {
    const encodedQuery = encodeURIComponent(query)
    const url = `${datasetteUrl}/${database}.json?sql=${encodedQuery}`
    try {
      const response = await axios.get(url)
      return response.data
    } catch (error) {
      logger.warn(error)
      throw error
    }
  }
}
