import * as v from 'valibot'
import config from '../../config/index.js'
import logger from './logger.js'
import { types } from './logging.js'

/**
 * Extract invalid schema paths from a validation error
 * @param {ValiError} error - Validation error object
 * @returns {Array<Array<string>>} Array of path arrays containing invalid fields
 */
export const invalidSchemaPaths = (error) => {
  if (error instanceof v.ValiError) {
    const paths = []
    for (const issue of error.issues) {
      if (issue.path) {
        paths.push(issue.path.flatMap((p) => p.key))
      }
    }
    return paths
  }
  throw new TypeError(`error is not a validation error: ${error.name}`)
}

/**
 * Render a template with validation in non-production environments
 *
 * If validation error is raised, it's logged and re-thrown.
 *
 * Motivation: we want to ensure in development/test environments, that the data passed to
 * our templates is valid. This will help us ensure that we're testing the right thing.
 *
 * Note: Relies on {@link config.environment}
 *
 * @param {Object} renderer - Renderer object
 * @param {Function} renderer.render - Render function that takes template and params
 * @param {string} template - Path to template
 * @param {Object} schema - Valibot schema
 * @param {Object} params - Template parameters
 * @returns {string} Rendered template
 */
export const render = (renderer, template, schema, params) => {
  let parsed = params
  if (config.environment !== 'production' && config.environment !== 'staging') {
    try {
      parsed = v.parse(schema, params)
    } catch (error) {
      if (error instanceof v.ValiError) {
        // the below will only show up in the terminal when testing
        // console.debug({ params, message: 'failed validation input' })
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
