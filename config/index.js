import HmpoConfig from 'hmpo-config'
import { combineConfigs, validateConfig } from './util.js'

/**
 *
 * @returns {{defaultConfig, environment, url, checkService: { userAgent: string }}}
 */
const getConfig = () => {
  const environment = process.env.NODE_ENV || process.env.ENVIRONMENT || 'production'
  const combinedConfig = combineConfigs(environment)
  validateConfig(combinedConfig)

  const config = new HmpoConfig()
  config.addConfig(combinedConfig)

  const configJson = config.toJSON()
  configJson.environment = environment
  return configJson
}

export default getConfig()
