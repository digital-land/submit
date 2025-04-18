/**
 * @module utils-entities
 *
 * @description Convenience functions for dealing with entity records.
 */

import logger from './logger.js'
import { types } from './logging.js'

/**
 * @param {String} s JSON string
 * @returns {Object|undefined}
 */
export const safeParse = (s) => {
  try {
    return JSON.parse(s)
  } catch (error) {
    logger.info('safeParse() failed to parse', { type: types.App, string: s })
    return undefined
  }
}

/**
 * Turns underscores into hyphens, deserialises the JSON field and
 * merges the resulting objects.
 *
 * This function is used to prepare the record for display,
 * so failure to deserialise the JSON blog is ignored and it's
 * the caller's responsibility to check and handle that manually.
 *
 * @param {Object} entity entity record
 * @returns {Object}
 */
export const prepareEntityForTable = (entity) => {
  const { json, ...rest } = entity
  const entries = Object.entries(rest).map(([k, v]) => [k.replaceAll('_', '-'), v])
  const ie = Object.fromEntries(entries)
  return Object.assign(ie, safeParse(json))
}
