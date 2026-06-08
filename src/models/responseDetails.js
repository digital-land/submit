import { getVerboseColumns } from '../utils/getVerboseColumns.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { pagination } from '../utils/pagination.js'
import axios from 'axios'
import config from '../../config/index.js'

/**
 * @typedef {Object} PaginationOptions
 * @property {string} [hash] - Hash option (should include the '#' character)
 * @property {Function} [href] - Function to generate href (item: number) => string
 */

/**
 * @typedef {Object} PaginationItem
 * @property {string} href - Link URL
 * @property {boolean} [ellipsis] - Whether this is an ellipsis item
 */

/**
 * @typedef {Object} PaginationResult
 * @property {number} totalResults - Total number of results
 * @property {number} offset - Current offset
 * @property {number} limit - Results per page limit
 * @property {number} currentPage - Current page number
 * @property {number|null} nextPage - Next page number or null
 * @property {number|null} previousPage - Previous page number or null
 * @property {number} totalPages - Total number of pages
 * @property {Array<{href: string}>} items - Pagination items with hrefs
 */

/**
 * Holds response data of 'http://ASYNC-REQUEST-API-HOST/requests/:result-id/response-details' endpoint.
 */
export default class ResponseDetails {
  #cachedFields
  #cachedGeometries
  #hasFetchedGeometries = false

  constructor (id, response, pagination, columnFieldLog) {
    this.id = id
    this.response = response
    this.pagination = pagination
    this.columnFieldLog = columnFieldLog
  }

  getRows () {
    if (!this.response) {
      logger.warn('trying to get response details when there are none', {
        requestId: this.id
      })
      return []
    }
    return this.response
  }

  /**
   * @returns {Object[]}
   */
  getColumnFieldLog () {
    if (!this.columnFieldLog) {
      logger.warn('trying to get column field log when there is none', {
        requestId: this.id
      })
      return []
    }
    return this.columnFieldLog
  }

  /**
   * Returns a collection of field names, where each name is either a column name from input data
   * or field name from the column field log. The resulting collection includes fields that
   * the submitted data might be missing.
   *
   * Note: fields are `converted_row.column | columnFieldLog.field`
   *
   * @returns {string[]}
   */
  getFields () {
    if (this.#cachedFields) {
      return this.#cachedFields
    }

    const columnKeys = new Set()
    const rows = this.getRows()
    if (rows.length > 0) {
      const keys = Object.keys(rows[0].converted_row)
      for (const key of keys) {
        columnKeys.add(key)
      }
    }

    const columnFieldLog = this.getColumnFieldLog()
    for (const [col, field] of columnFieldLog.map((field) => [field.column, field.field])) {
      if (!columnKeys.has(col)) {
        columnKeys.add(field)
      }
    }

    this.#cachedFields = [...columnKeys]
    return this.#cachedFields
  }

  /**
   * Returns an array of rows with verbose columns, optionally filtering out rows without errors.
   *
   * @param {boolean} [filterNonErrors=false] - If true, only return rows that have at least one error.
   * @returns {Array<object>} An array of rows with verbose columns, each containing:
   *   - `entryNumber`: the entry number of the row
   *   - `hasErrors`: a boolean indicating whether the row has any errors
   *   - `columns`: an array of verbose column details, each containing:
   *     - `key`: the column key
   *     - `value`: the column value
   *     - `column`: the column name
   *     - `field`: the field name
   *     - `error`: an error message if data was missing
   */
  getRowsWithVerboseColumns (filterNonErrors = false) {
    if (!this.response) {
      logger.warn('trying to get response details when there are none', {
        requestId: this.id
      })
      return []
    }

    let rows = this.response

    if (filterNonErrors) {
      rows = rows.filter(
        (row) =>
          row.issue_logs.filter((issue) => issue.severity === 'error').length >
          0
      )
    }

    // Map over the details in the response and return an array of rows with verbose columns
    return rows.map((row) => ({
      entryNumber: row.entry_number,
      hasErrors:
        row.issue_logs.filter((issue) => issue.severity === 'error').length > 0,
      columns: getVerboseColumns(row, this.getColumnFieldLog())
    }))
  }

  getGeometryKey () {
    const columnFieldLog = this.getColumnFieldLog()

    if (!columnFieldLog) {
      return null
    }

    const columnFieldEntry =
      columnFieldLog.find((column) => column.field === 'point') ||
      columnFieldLog.find((column) => column.field === 'geometry')

    if (!columnFieldEntry) {
      return null
    }

    return columnFieldEntry.column
  }

  /**
   * Returns array of geometries when available, `undefined` otherwise.
   *
   * @returns {any[] | undefined }
   */
  async getGeometries () {
    if (this.#hasFetchedGeometries) {
      return this.#cachedGeometries
    }

    this.#cachedGeometries = await this.#fetchGeometries()
    this.#hasFetchedGeometries = true
    return this.#cachedGeometries
  }

  async #fetchGeometries () {
    if (!this.id) {
      return undefined
    }

    const url = new URL(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${this.id}/geometries`)
    let response
    try {
      response = await axios.get(url, { timeout: 30000 })
    } catch (error) {
      logger.warn('failed to fetch response geometries', {
        type: types.DataFetch,
        requestId: this.id,
        errorMessage: error.message
      })
      return undefined
    }
    const totalResults = Number.parseInt(response.headers?.['x-pagination-total-results'])
    const geometries = response.data

    if (!Array.isArray(geometries)) {
      return undefined
    }

    const limit = Number.parseInt(response.headers?.['x-pagination-limit']) || geometries.length || 500

    if (!Number.isInteger(totalResults) || geometries.length >= totalResults) {
      return geometries.length > 0 ? geometries : undefined
    }

    for (let offset = geometries.length; offset < totalResults; offset += limit) {
      const pageUrl = new URL(url)
      pageUrl.searchParams.set('offset', offset)
      pageUrl.searchParams.set('limit', limit)
      const page = await axios.get(pageUrl, { timeout: 30000 })
      if (!Array.isArray(page.data)) {
        break
      }
      geometries.push(...page.data)
    }

    return geometries
  }

  /**
   * Get pagination details for the current response
   *
   * @param {number} pageNumber
   * @param {PaginationOptions} [opts] - Pagination options
   * @returns {PaginationResult} Pagination result object
   */
  getPagination (pageNumber, opts = {}) {
    pageNumber = parseInt(pageNumber)
    if (Number.isNaN(pageNumber)) pageNumber = 1
    const totalPages = Math.ceil(
      this.pagination.totalResults / this.pagination.limit
    )

    const hash = opts.hash ?? ''
    const hrefFn =
      opts.href ?? ((item) => `/check/results/${this.id}/${item}${hash}`)
    const items = pagination(totalPages, pageNumber).map((item) => {
      if (item === '...') {
        return {
          ellipsis: true,
          href: '#'
        }
      } else {
        return {
          number: item,
          href: hrefFn(item),
          current: pageNumber === item
        }
      }
    })

    return {
      totalResults: parseInt(this.pagination.totalResults),
      offset: parseInt(this.pagination.offset),
      limit: parseInt(this.pagination.limit),
      currentPage: pageNumber,
      nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
      previousPage: pageNumber > 1 ? pageNumber - 1 : null,
      totalPages,
      items
    }
  }
}
