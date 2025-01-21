import logger from './logger.js'
import { types } from './logging.js'

/** @typedef {import('../../config/util.js').ConfigSchema} ConfigSchema */

/**
 *
 * @param {any} config config
 * @param {string} feature feature
 * @returns {boolean}
 */
export const isFeatureEnabled = (config, feature) => {
  const features = config?.features
  if (features && feature in features) {
    const featureConfig = features[feature]
    const enabled = (featureConfig.enabled)
    logger.info('feature check', { type: types.Feature, feature, config: featureConfig, enabled })
    return enabled
  }
  return false
}
