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
 * Uses the `errorPages/error.njk` template, but it can be overriden via options.
 */
export class MiddlewareError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode status to be returned to the client
   * @param {{template?: string, cause?: Error}} options template path
   */
  constructor (message, statusCode, options = {}) {
    super(message, options)
    if (typeof statusCode !== 'number') {
      throw new Error(`statusCode should be a number: ${statusCode}`)
    }
    this.statusCode = statusCode
    this.template = options?.template ?? 'errorPages/error.njk'
  }
}
