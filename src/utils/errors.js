import config from '../../config/index.js'

const context = {
  env: process.env.NODE_ENV || process.env.ENVIRONMENT || 'local',
  supportEmail: config.contact.issues.email
}

export function errorTemplateContext () {
  return { ...context }
}

/**
 * Use this class if you want to display specific HTTP error page.
 *
 * Uses the `errorPages/error.njk` template, but it can be overridden via options.
 */
export class MiddlewareError extends Error {
  /**
   * Create a new MiddlewareError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code to return to the client
   * @param {Object} [options] - Additional options
   * @param {string} [options.template] - Custom error template path
   * @param {Error} [options.cause] - Cause of the error
   */
  constructor (message, statusCode, options = {}) {
    super(message, options)
    if (typeof statusCode !== 'number') {
      throw new Error(`statusCode should be a number: ${statusCode}`)
    }
    this.statusCode = statusCode
    this.template = options?.template ?? 'errorPages/error.njk'
    this.errorDetail = options?.errorDetail
  }
}
