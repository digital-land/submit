import * as v from 'valibot'
import config from '../../config/index.js'
import logger from './logger.js'
import { types } from './logging.js'

/**
 * @param {ValiError} error
 * @returns {[string][]}
 */
export const invalidSchemaPaths = (error) => {
  if (error instanceof v.ValiError) {
    return error.issues.map((issue) => issue.path.flatMap((p) => p.key))
  }
  throw new TypeError(`error is not a validation error: ${error.name}`)
}

/**
 * Depending on the config, validates the params against the given schema before rendering the template.
 *
 * If validation error is raised, it's logged and re-thrown.
 *
 * Motivation: we want to ensure in developmen/test environments, that the data passed to
 * our templates is valid. This will help us ensure that we're testing the right thing.
 *
 * Note: Relies on {@link config.environment}
 *
 * @param {Response | { render: (template: string, params: object) => string} } renderer
 * @param {string} template path to template
 * @param {object} schema valibot schema
 * @param {object} params
 * @returns {string}
 */
export const render = (renderer, template, schema, params) => {
  let parsed = params
  if (config.environment !== 'production' && config.environment !== 'staging') {
    try {
      parsed = v.parse(schema, params)
    } catch (error) {
      if (error instanceof v.ValiError) {
        // the below will only show up in the terminal when testing
        console.debug({ params, message: 'failed validation input' })
        logger.warn(
          validationErrorMessage(error, template),
          {
            errorMessage: `${error.message}`,
            pathsWithIssues: invalidSchemaPaths(error),
            type: types.App
          }
        )
      }
      throw error
    }
  }
  return renderer.render(template, parsed)
}

/**
 * Creates an error message from the given error
 *
 * @param {ValiError} error validation error
 * @param {string} template template name
 * @returns string
 */
function validationErrorMessage (error, template) {
  const numIssues = error.issues.length
  const message = `Found ${numIssues} validation issue${numIssues === 1 ? '' : 's'} in template params for '${template}'`
  return message
}
