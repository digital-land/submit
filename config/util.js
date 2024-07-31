import fs from 'fs'
import _ from 'lodash'
import yaml from 'js-yaml'
import * as v from 'valibot'

export const ConfigSchema = v.object({
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
  console.assert(config, 'config not specified')
  return yaml.load(fs.readFileSync(`./config/${config}.yaml`, 'utf8'))
}

/**
 * Reads configs from disk, based on env variables
 * when 'environment' option not specified.
 *
 * @returns {Object}
 */
export function combineConfigs (environment) {
  console.assert(environment, 'environment not specified')
  const defaultConfig = readConfig('default')
  const customConfig = readConfig(environment)
  return _.merge({}, defaultConfig, customConfig)
}

export const validateConfig = (config) => {
  try {
    return v.parse(ConfigSchema, config)
  } catch (error) {
    console.error('invalid config', error.message)
    for (const issue of error.issues) {
      console.info(
        `issue under path: [${issue.path.map((elem) => elem.key).join(', ')}]`
      )
    }
    throw error
  }
}
