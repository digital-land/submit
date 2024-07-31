import HmpoConfig from 'hmpo-config'
import yaml from 'js-yaml'
import fs from 'fs'
import _ from 'lodash'

const readConfig = (config) => {
  return yaml.load(fs.readFileSync(`./config/${config}.yaml`, 'utf8'))
}

/**
 *
 * @returns {{defaultConfig, environment}}
 */
const getConfig = () => {
  const defaultConfig = readConfig('default')

  const environment = process.env.NODE_ENV || process.env.ENVIRONMENT || 'production'

  if (environment !== 'test') console.info('USING CONFIG: ' + environment)

  const customConfig = readConfig(environment)

  const combinedConfig = _.merge({}, defaultConfig, customConfig)

  const config = new HmpoConfig()
  config.addConfig(combinedConfig)

  const configJson = config.toJSON()
  configJson.environment = environment
  return configJson
}

export default getConfig()
