import HmpoConfig from 'hmpo-config'
import yaml from 'js-yaml'
import fs from 'fs'
import _ from 'lodash'
import * as v from 'valibot'

const ConfigSchema = v.object({
  port: v.pipe(v.integer(), v.minValue(1)),
  asyncRequestApi: v.object({
    url: v.url(),
    port: v.pipe(v.integer(), v.minValue(1)),
    requestsEndpoint: v.pipe(v.string(), v.nonEmpty()),
    requestTimeout: v.number()
  }),
  maintenance: v.object({
    serviceUnavailable: v.boolean(),
    upTime: v.pipe(v.string(), v.nonEmpty())
  }),
  aws: v.object({
    region: v.string(),
    bucket: v.string(),
    s3ForcePathStyle: v.boolean()
  }),
  redis: v.optional(
    v.object({
      secure: v.boolean(),
      host: v.pipe(v.string(), v.nonEmpty()),
      port: v.number()
    })
  ),
  url: v.url(),
  serviceName: v.pipe(v.string(), v.nonEmpty()),
  feedbackLink: v.url(),
  email: v.object({
    templates: v.object({
      RequesetTemplateId: v.uuid(),
      AcknowledgementTemplateId: v.uuid()
    }),
    dataManagementEmail: v.pipe(v.string(), v.email())
  })
})

const readConfig = (config) => {
  return yaml.load(fs.readFileSync(`./config/${config}.yaml`, 'utf8'))
}

/**
 *
 * @returns {{defaultConfig, environment}}
 */
const getConfig = () => {
  const defaultConfig = readConfig('default')

  const environment =
    process.env.NODE_ENV || process.env.ENVIRONMENT || 'production'

  if (environment !== 'test') console.info('USING CONFIG: ' + environment)

  const customConfig = readConfig(environment)

  const combinedConfig = _.merge({}, defaultConfig, customConfig)

  try {
    v.parse(ConfigSchema, combinedConfig)
  } catch (error) {
    console.error('invalid config', error.message)
    for (let issue of error.issues) {
      console.info(`issue under path: [${issue.path.map(elem => elem.key).join(', ')}]`)
    }
    throw error
  }

  const config = new HmpoConfig()
  config.addConfig(combinedConfig)

  const configJson = config.toJSON()
  configJson.environment = environment
  return configJson
}

export default getConfig()
