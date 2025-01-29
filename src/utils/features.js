import logger from './logger.js'
import { types } from './logging.js'
import config from '../../config/index.js'

/** @typedef {import('../../config/util.js').ConfigSchema} ConfigSchema */

/**
 * @param {string} feature feature
 * @param {Object | undefined} config config
 * @returns {boolean}
 */
export const isFeatureEnabled = (feature, configuration = undefined) => {
  const conf = configuration ?? config
  const features = conf?.features
  if (features && feature in features) {
    const featureConfig = features[feature]
    const enabled = featureConfig.enabled
    logger.info('feature check', { type: types.Feature, feature, config: featureConfig })
    return enabled
  }
  return false
}
