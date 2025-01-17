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
  const env = config.environment
  const features = config?.features
  if (features && feature in features) {
    const featureConfig = features[feature]
    const enabled = (featureConfig.enabled && (featureConfig.environments ?? []).indexOf(env) >= 0)
    logger.info('feature check', { type: types.AppLifecycle, feature: featureConfig, enabled })
    return enabled
  }
  return false
}
