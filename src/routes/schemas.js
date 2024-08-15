/**
 * This module provides code a 'render()' method wrapper that enforces
 * a schema on the parameters passed to a template.
 */

import * as v from 'valibot'
import config from '../../config/index.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { ValiError } from 'valibot'

export const EmptyParams = v.object({})
export const UptimeParams = v.object({
  upTime: v.string()
})

export const ErrorParams = v.strictObject({
  err: v.object({})
})

const NonEmptyString = v.pipe(v.string(), v.nonEmpty())

export const Base = v.object({
  // pageTitle: NonEmptyString,
  pageName: v.optional(NonEmptyString)
  // serviceName: NonEmptyString,
})

export const StartPage = v.object({
  ...Base.entries
})

/**
 * The values of this enum should match values of the 'status' column
 * in the query in `performanceDbApi.getLpaOverview()`
 */
const datasetStatusEnum = {
  Live: 'Live',
  'Needs fixing': 'Needs fixing',
  Warning: 'Warning',
  Error: 'Error',
  'Not submitted': 'Not submitted'
}

const OrgNameField = v.strictObject({ name: NonEmptyString })
const DatasetNameField = v.strictObject({ name: NonEmptyString })

export const OrgOverviewPage = v.strictObject({
  organisation: v.strictObject({
    name: NonEmptyString,
    organisation: NonEmptyString
  }),
  datasets: v.array(v.strictObject({
    endpoint: v.url(),
    status: v.enum(datasetStatusEnum),
    slug: NonEmptyString
  })),
  totalDatasets: v.integer(),
  datasetsWithEndpoints: v.integer(),
  datasetsWithIssues: v.integer(),
  datasetsWithErrors: v.integer()
})

export const OrgFindPage = v.strictObject({
  alphabetisedOrgs: v.record(NonEmptyString,
    v.array(v.strictObject({
      name: NonEmptyString,
      organisation: NonEmptyString
    })))
})

export const OrgGetStarted = v.strictObject({
  organisation: OrgNameField,
  dataset: DatasetNameField
})

export const OrgDatasetTaskList = v.strictObject({
  taskList: v.array(v.strictObject({
    title: { text: NonEmptyString },
    href: v.url(),
    status: NonEmptyString
  })),
  organisation: OrgNameField,
  dataset: DatasetNameField
})

export const OrgEndpointError = v.strictObject({
  organisation: OrgNameField,
  dataset: DatasetNameField,
  errorData: v.strictObject({
    endpoint_url: v.url(),
    http_status: v.integer(),
    latest_log_entry_date: v.isoDateTime(),
    latest_200_date: v.isoDateTime()
  })
})

export const OrgIssueDetails = v.strictObject({
  organisation: OrgNameField,
  dataset: DatasetNameField,
  errorHeading: NonEmptyString,
  issueItems: v.array(v.strictObject({
    html: v.string(),
    href: v.url()
  })),
  issueType: NonEmptyString,
  entry: v.strictObject({
    title: NonEmptyString,
    fields: v.array(v.strictObject({
      key: v.strictObject({ text: NonEmptyString }),
      value: v.strictObject({ html: v.string() }),
      classes: v.string()
    }))
  })
})

/**
 * @param {ValiError} error
 * @returns {[]}
 */
export const invalidSchemaPaths = (error) => {
  if (error instanceof ValiError) {
    return error.issues.map(issue => issue.path.flatMap(p => p.key))
  }
  throw new TypeError(`error is not a validation error: ${error.name}`)
}

/**
 *
 * Note: Relies on {@link config.environment}
 *
 * @param {Response | { render: (template: string, params: object) => void} } renderer
 * @param {string} template path to template
 * @param {object} schema valibot schema
 * @param {object} params
 */
export const render = (renderer, template, schema, params) => {
  let parsed = params
  try {
    parsed = v.parse(schema, params)
  } catch (error) {
    if (error instanceof v.ValiError && config.environment !== 'production') {
      // console.debug({ params, message: 'failed validation input' })
      const numIssues = error.issues.length
      logger.warn(`Found ${numIssues} validation issue${numIssues === 1 ? '' : 's'} in template params for '${template}'`, {
        errorMessage: `${error.message}`,
        pathsWithIssues: invalidSchemaPaths(error),
        type: types.App
      })
      throw error
    }
  }
  renderer.render(template, parsed)
}
