import fs from 'fs'
import _ from 'lodash'
import yaml from 'js-yaml'
import * as v from 'valibot'

const NonEmptyString = v.pipe(v.string(), v.nonEmpty())

/**
 * Information to allow us to display sanely worded messages about entities.
 *
 * - `base` is the part that doesn't change
 * - `variable` should be specified in singular, and can be potentially turned into plural
 *    (by application code or template) when displayed.
 */
const EntityDisplay = v.object({
  base: v.optional(NonEmptyString),
  variable: NonEmptyString
})

export const ConfigSchema = v.object({
  port: v.pipe(v.integer(), v.minValue(1)),
  asyncRequestApi: v.object({
    url: v.url(),
    port: v.pipe(v.integer(), v.minValue(1)),
    requestsEndpoint: NonEmptyString,
    requestTimeout: v.number()
  }),
  maintenance: v.object({
    serviceUnavailable: v.boolean(),
    upTime: NonEmptyString
  }),
  aws: v.object({
    region: v.string(),
    bucket: v.string(),
    s3ForcePathStyle: v.boolean()
  }),
  redis: v.optional(
    v.object({
      secure: v.boolean(),
      host: NonEmptyString,
      port: v.number()
    })
  ),
  url: v.url(),
  mainWebsiteUrl: v.url(),
  serviceName: NonEmptyString,
  serviceNames: v.object({
    check: NonEmptyString,
    submit: NonEmptyString,
    manage: NonEmptyString
  }),
  checkService: v.object({
    userAgent: NonEmptyString
  }),
  templateContent: v.object({
    feedbackLink: v.url(),
    homepageUrl: NonEmptyString // relative link, e.g. '/manage
  }),
  email: v.object({
    templates: v.object({
      RequesetTemplateId: v.uuid(),
      AcknowledgementTemplateId: v.uuid()
    }),
    dataManagementEmail: v.pipe(v.string(), v.email())
  }),
  datasetsConfig: v.object(
    [
      'article-4-direction',
      'article-4-direction-area',
      'brownfield-land',
      'conservation-area',
      'conservation-area-document',
      'tree-preservation-order',
      'tree-preservation-zone',
      'tree',
      'listed-building',
      'listed-building-outline'
    ].reduce((acc, key) => {
      acc[key] = v.object({
        guidanceUrl: v.string(),
        entityDisplayName: EntityDisplay
      })
      return acc
    }, {})
  ),
  smartlook: v.optional(
    v.object({
      key: v.string(),
      region: v.string()
    })
  ),
  googleAnalytics: v.optional(
    v.object({
      measurementId: v.string()
    })
  ),
  tablePageLength: v.number(),
  contact: v.object({
    issues: v.object({
      email: v.pipe(v.string(), v.email())
    })
  }),
  features: v.optional(v.record(
    NonEmptyString, v.object({
      enabled: v.boolean()
    })))
})

const readConfig = (config) => {
  console.assert(config, 'config not specified')
  return yaml.load(fs.readFileSync(`./config/${config}.yaml`, 'utf8'))
}

/**
 * @typedef {Object} Config
 */

/**
 * Reads configs from disk, based on env variables
 * when 'environment' option not specified.
 *
 * @returns {Config}
 */
export function combineConfigs (environment) {
  console.assert(environment, 'environment not specified')
  const defaultConfig = readConfig('default')
  const customConfig = readConfig(environment)
  return _.merge({}, defaultConfig, customConfig)
}

/**
 * Validates the config object against the ConfigSchema.
 *
 * @param {*} config
 * @returns {Config}
 * @throws {ValibotError}
 */
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
