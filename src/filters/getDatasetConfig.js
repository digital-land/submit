import config from '../../config/index.js'

export const getDatasetGuidanceUrl = (datasetId) => {
  return config?.datasetsConfig?.[datasetId]?.guidanceUrl
}
