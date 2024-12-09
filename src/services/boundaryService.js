import axios from 'axios'
import config from '../../config/index.js'

export const getBoundaryForLpa = async (boundaryId) => {
  try {
    const [datasetId, lpaId] = boundaryId.split(':')
    if (!datasetId || !lpaId) {
      return {
        error: 'Invalid boundary ID'
      }
    }

    const response = await axios.get(`${config.mainWebsiteUrl}/entity.json?dataset=${datasetId}&reference=${lpaId}`)
    const entity = response?.data?.entities?.[0] ?? null
    if (!entity || !entity?.['local-planning-authority']) {
      return {
        error: `Failed to get boundary data for ${boundaryId}. Please ensure you are sending the correct parameters.`
      }
    }

    const boundaryResponse = await axios.get(`${config.mainWebsiteUrl}/entity.geojson?reference=${entity['local-planning-authority']}`)
    return boundaryResponse.data
  } catch (error) {
    return {
      error: `Failed to get boundary data: ${
        error.response?.status === 404
          ? 'LPA not found'
          : `Error ${error.response?.status}: ${error.response?.statusText || 'Service temporarily unavailable'}`
      }`
    }
  }
}
