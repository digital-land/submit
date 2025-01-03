import fs from 'fs'
import _ from 'lodash'
import yaml from 'js-yaml'
import * as v from 'valibot'
/** @typedef {import('./util-types.js').Config} Config */

const NonEmptyString = v.pipe(v.string(), v.nonEmpty('must not be empty'))

const PortValue = v.pipe(
  v.number(),
  v.integer('port must be an integer'))

const UUID = v.pipe(v.string(), v.uuid())

export const ConfigSchema = v.object({
  port: PortValue,
  asyncRequestApi: v.object({
    url: v.pipe(v.string(), v.url()),
    port: PortValue,
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
  url: v.pipe(v.string(), v.url()),
  mainWebsiteUrl: v.pipe(v.string(), v.url()),
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
    feedbackLink: v.pipe(v.string(), v.url()),
    homepageUrl: NonEmptyString // relative link, e.g. '/manage
  }),
  email: v.object({
    templates: v.object({
      RequesetTemplateId: UUID,
      AcknowledgementTemplateId: UUID
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
    ].reduce((/** @type {any} */acc, key) => {
      acc[key] = v.object({ guidanceUrl: v.string() })
      return acc
    }, {})
  ),
  guidanceNavigation: v.object({
    title: v.string(),
    items: v.array(v.object({
      label: v.string(),
      url: v.string(),
      items: v.optional(
        v.array(
          v.object({
            label: v.string(),
            url: v.string()
          })
        )
      )
    }))
  }),
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
  tablePageLength: v.number()
})

/**
 * Reads a config file from disk.
 *
 * @param {String} config
 * @returns {Object}
 */
const readConfig = (config) => {
  console.assert(config, 'config not specified')
  // @ts-ignore
  return yaml.load(fs.readFileSync(`./config/${config}.yaml`, 'utf8'))
}

/**
 * Reads configs from disk, based on env variables
 * when 'environment' option not specified.
 *
 * @param {String} environment
 * @returns {Object}
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
 * @returns {v.InferOutput<typeof ConfigSchema>}
 * @throws {v.ValidationError}
 */
export const validateConfig = (config) => {
  try {
    return v.parse(ConfigSchema, config)
  } catch (error) {
    if (error instanceof v.ValiError) {
      console.error('invalid config', error.message)
      for (const issue of error.issues) {
        console.info(
          `issue under path: [${issue.path.map((/** @type {any} */elem) => elem.key).join(', ')}]`
        )
      }
    }
    throw error
  }
}
