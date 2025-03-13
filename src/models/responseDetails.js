import { getVerboseColumns } from '../utils/getVerboseColumns.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { pagination } from '../utils/pagination.js'

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

  getColumnFieldLog () {
    if (!this.columnFieldLog) {
      logger.warn('trying to get column field log when there is none', {
        requestId: this.id
      })
      return []
    }
    return this.columnFieldLog
  }

  getColumns () {
    if (!this.getRows().length) {
      return []
    }

    const fields = this.getFields()

    const ColumnsWithDuplicates = fields.map((field) => {
      const columnFieldLog = this.getColumnFieldLog()
      const fieldLog = columnFieldLog.find(
        (fieldLog) => fieldLog.field === field
      )
      return fieldLog ? fieldLog.column : field
    })

    return [...new Set(ColumnsWithDuplicates)]
  }

  /**
   * returned fields are `converted_row.column | columnFieldLog.field`
   *
   * @returns {string[]}
   */
  getFields () {
    const columnKeys = [
      ...new Set(
        this.getRows()
          .map((row) => row.converted_row)
          .flatMap((row) => Object.keys(row))
      )
    ]

    const columnFieldLog = this.getColumnFieldLog()
    return [
      ...new Set(
        columnKeys.map((column) => {
          const fieldLog = columnFieldLog.find(
            (fieldLog) => fieldLog.column === column
          )
          if (!fieldLog) {
            return column
          } else {
            return fieldLog.field
          }
        })
      )
    ]
  }

  getFieldMappings () {
    return Object.fromEntries(
      this.getFields().map((field) => {
        const columnFieldLog = this.getColumnFieldLog()
        const columnLog = columnFieldLog.find(
          (fieldLog) => fieldLog.field === field
        )
        return [field, columnLog ? columnLog.column : null]
      })
    )
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
  getGeometries () {
    const rows = this.getRows()
    if (rows.length === 0) {
      return undefined
    }

    const item = rows[0]
    const getGeometryValue = this.#makeGeometryGetter(item)
    if (!getGeometryValue) {
      logger.debug('could not create geometry getter', {
        type: types.App,
        requestId: this.id
      })
      return undefined
    }

    const geometries = []
    for (const item of rows) {
      const geometry = getGeometryValue(item)
      if (geometry && geometry.trim() !== '') {
        geometries.push(geometry)
      }
    }
    logger.debug('getGetometries()', {
      type: types.App,
      requestId: this.id,
      geometryCount: geometries.length,
      rowCount: rows.length
    })
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

  /**
   * Detects where geometry is stored in the item and returns a function to extract geometry value.
   * It's caller's responsibility to handle situations where the getter couldn't be returned.
   * For most common use cases, we can omit displaying the map.
   *
   * @param {Object} item - Data item containing geometry information
   * @returns {Function|undefined} Function that takes an item and returns a geometry string, or undefined if no geometry found
   */
  #makeGeometryGetter (item) {
    /*
      The api seems to sometimes respond with weird casing, it can be camal case, all lower or all upper
      I'll implement a fix here, but hopefully infa will be addressing it on the backend to
    */

    const key = item.transformed_row.find(obj => obj.field === 'geometry' || obj.field === 'point')?.field
    const getter = (row) => {
      const geometry = row.transformed_row.find(obj => obj.field === key)
      return geometry?.value
    }
    return key ? getter : undefined
  }
}
