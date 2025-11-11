import config from '../../config/index.js'

export const getDatasetGuidanceUrl = (datasetId) => {
  if (datasetId === 'default') {
    return '/guidance/specifications'
  }
  return config?.datasetsConfig?.[datasetId]?.guidanceUrl
}
