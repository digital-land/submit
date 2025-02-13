import { getVerboseColumns } from '../utils/getVerboseColumns.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { pagination } from '../utils/pagination.js'

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
      logger.warn('trying to get response details when there are none', { requestId: this.id })
      return []
    }
    return this.response
  }

  getColumnFieldLog () {
    if (!this.columnFieldLog) {
      logger.warn('trying to get column field log when there is none', { requestId: this.id })
      return []
    }
    return this.columnFieldLog
  }

  getColumns () {
    if (!this.getRows().length) {
      return []
    }

    const fields = this.getFields()

    const ColumnsWithDuplicates = fields.map(field => {
      const columnFieldLog = this.getColumnFieldLog()
      const fieldLog = columnFieldLog.find(fieldLog => fieldLog.field === field)
      return fieldLog ? fieldLog.column : field
    })

    return [...new Set(ColumnsWithDuplicates)]
  }

  getFields () {
    const columnKeys = [...new Set(this.getRows().map(row => row.converted_row).flatMap(row => Object.keys(row)))]

    return [...new Set(columnKeys.map(column => {
      const columnFieldLog = this.getColumnFieldLog()
      const fieldLog = columnFieldLog.find(fieldLog => fieldLog.column === column)
      if (!fieldLog) {
        return column
      } else {
        return fieldLog.field
      }
    }))]
  }

  getFieldMappings () {
    return Object.fromEntries(this.getFields().map(field => {
      const columnFieldLog = this.getColumnFieldLog()
      const columnLog = columnFieldLog.find(fieldLog => fieldLog.field === field)
      return [
        field,
        columnLog ? columnLog.column : null
      ]
    }))
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
      logger.warn('trying to get response details when there are none', { requestId: this.id })
      return []
    }

    let rows = this.response

    if (filterNonErrors) {
      rows = rows.filter(row => row.issue_logs.filter(issue => issue.severity === 'error').length > 0)
    }

    // Map over the details in the response and return an array of rows with verbose columns
    return rows.map(row => ({
      entryNumber: row.entry_number,
      hasErrors: row.issue_logs.filter(issue => issue.severity === 'error').length > 0,
      columns: getVerboseColumns(row, this.getColumnFieldLog())
    }))
  }

  getGeometryKey () {
    const columnFieldLog = this.getColumnFieldLog()

    if (!columnFieldLog) {
      return null
    }

    const columnFieldEntry = columnFieldLog.find(column => column.field === 'point') || columnFieldLog.find(column => column.field === 'geometry')

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
      logger.debug('could not create geometry getter', { type: types.App, requestId: this.id })
      return undefined
    }

    const geometries = []
    for (const item of rows) {
      const geometry = getGeometryValue(item)
      if (geometry && geometry.trim() !== '') {
        geometries.push(geometry)
      }
    }
    logger.debug('getGetometries()', { type: types.App, requestId: this.id, geometryCount: geometries.length, rowCount: rows.length })
    return geometries
  }

  /**
   * @param {number} pageNumber
   * @param {{ hash?: string }} opts hash option should include the '#' character
   * @returns {{ totalResults: number, offset: number, limit: number, currentPage: number, nextPage: number | null, previousPage: number | null, totalPages: number, items: { href: string }[] } }
   */
  getPagination (pageNumber, opts = {}) {
    pageNumber = parseInt(pageNumber)
    if (Number.isNaN(pageNumber)) pageNumber = 0
    const totalPages = Math.ceil(this.pagination.totalResults / this.pagination.limit)

    const hash = opts.hash ?? ''
    const items = pagination(totalPages, pageNumber + 1).map(item => {
      if (item === '...') {
        return {
          ellipsis: true,
          href: '#'
        }
      } else {
        return {
          number: item,
          href: `/check/results/${this.id}/${parseInt(item) - 1}${hash}`,
          current: pageNumber === parseInt(item) - 1
        }
      }
    })

    return {
      totalResults: parseInt(this.pagination.totalResults),
      offset: parseInt(this.pagination.offset),
      limit: parseInt(this.pagination.limit),
      currentPage: pageNumber + 1,
      nextPage: pageNumber < totalPages - 1 ? pageNumber + 1 : null,
      previousPage: pageNumber > 0 ? pageNumber - 1 : null,
      totalPages,
      items
    }
  }

  /**
   * Detects where geometry is stored in the item and returns a function of
   * item to geometry value. It's caller responsibility to handle situations
   * where the getter couldn't be returned (for most common use case, we can
   * omit diplaying the map).
   *
   * @param {any} item
   * @returns { ((item) => string ) | undefined}
   */
  #makeGeometryGetter (item) {
    /*
      The api seems to sometimes respond with weird casing, it can be camal case, all lower or all upper
      I'll implement a fix here, but hopefully infa will be addressing it on the backend to
    */
    const keys = Object.fromEntries(Object.keys(item.converted_row).map(key => [key.toLowerCase(), key]))
    let getGeometryValue
    if ('point' in keys) {
      getGeometryValue = row => row.converted_row[keys.point]
    } else if ('geometry' in keys) {
      getGeometryValue = row => row.converted_row[keys.geometry]
    } else if ('wkt' in keys) {
      getGeometryValue = row => row.converted_row[keys.wkt]
    } else if ('geox' in keys) {
      logger.debug('converted_row', { type: types.App, transformedRow: item.transformed_row })
      getGeometryValue = row => {
        const GeoX = row.converted_row[keys.geox]
        const GeoY = row.converted_row[keys.geoy]
        if (GeoX === '' || GeoY === '') return ''
        return `POINT (${GeoX} ${GeoY})`
      }
    } else {
      // unexpected, but let's take a note and proceed without throwing
      logger.warn('geometry data not found in response details', { requestId: this.id, type: types.App })
    }

    return getGeometryValue
  }
}
