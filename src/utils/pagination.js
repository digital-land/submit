/**
 * @module utils-pagination
 *
 * @description Utilities for dealing with pagination.
 */

import * as v from 'valibot'
const { min, max } = Math
const range = (lo, hi) => Array.from({ length: hi - lo }, (_, i) => i + lo)

/**
 * Generate pagination numbers with ellipsis for long ranges
 * @param {number} count - Total number of pages
 * @param {number} current - Current page number
 * @param {string} [ellipsis='...'] - Ellipsis character(s)
 * @returns {Array<number|string>} Array of page numbers and ellipsis
 */
export const pagination = (count, current, ellipsis = '...') => {
  if (count <= 5) {
    return range(1, count + 1)
  }
  const adjacent = 1
  const left = current === count ? current - 2 * adjacent : max(1, current - adjacent)
  const right = current === 1 ? 1 + adjacent * 2 : min(count, current + adjacent)
  const middle = range(left, right + 1)
  let leftEllipsis = left > 1
  let rightEllipsis = right < count

  if (leftEllipsis && middle[0] === 2) {
    leftEllipsis = false
    middle.unshift(1)
  }

  if (rightEllipsis && middle[middle.length - 1] === count - 1) {
    rightEllipsis = false
    middle.push(count)
  }

  const result = [
    ...(leftEllipsis ? [1, ellipsis] : middle),
    ...(leftEllipsis && rightEllipsis ? middle : []),
    ...(rightEllipsis ? [ellipsis, count] : middle)
  ]
  return result
}

/**
 *
 * Turn items in array returned by {@link pagination} into items
 * conforming to the PaginationItem schema.
 *
 * @param {number|string} paginationItem
 * @param {Object} options options
 * @param {number} options.pageNumber
 * @param {Function} options.href pagination link factory function paginationItem => string
 * @returns {Object}
 */
export const makeItem = (paginationItem, options) => {
  const { pageNumber, href } = v.parse(v.object({ pageNumber: v.pipe(v.number(), v.integer()), href: v.function() }), options)

  if (typeof paginationItem === 'number') {
    return {
      type: 'number',
      number: paginationItem,
      href: href(paginationItem),
      current: paginationItem === pageNumber
    }
  } else {
    return {
      type: 'ellipsis',
      ellipsis: true,
      href: '#'
    }
  }
}

/**
 *
 * @param {Object} options
 * @param {number} options.pageNumber
 * @param {string} options.baseSubpath
 * @param {Object} options.dataRange
 * @param {Object} options.dataRange.maxPageNumber
 * @returns {Object} pagination object for use in templates
 */
export const createPaginationTemplateParamsObject = (options) => {
  const { pageNumber, baseSubpath, dataRange } = v.parse(v.object({
    pageNumber: v.pipe(v.number(), v.integer()),
    baseSubpath: v.string(),
    dataRange: v.object({ maxPageNumber: v.pipe(v.number(), v.integer(), v.minValue(1)) })
  }), options)

  /**
   * @typedef {Object} PaginationItem
   * @property {'ellipsis'|'number'} type - Type of pagination item
   * @property {number} [number] - Page number (for number type)
   * @property {string} href - Link URL
   * @property {boolean} [ellipsis] - Whether this is an ellipsis item
   * @property {boolean} [current] - Whether this is the current page
   */

  /**
   * @typedef {Object} PaginationNav
   * @property {Object} [previous] - Previous page link
   * @property {string} previous.href - Previous page URL
   * @property {Object} [next] - Next page link
   * @property {string} next.href - Next page URL
   * @property {PaginationItem[]} items - Pagination items
   */

  /** @type {PaginationNav} */
  const paginationObj = {
    previous: undefined,
    next: undefined,
    items: []
  }

  if (pageNumber > 1) {
    paginationObj.previous = {
      href: `${baseSubpath}/${pageNumber - 1}`
    }
  }
  if (pageNumber < dataRange.maxPageNumber) {
    paginationObj.next = {
      href: `${baseSubpath}/${pageNumber + 1}`
    }
  }

  for (const item of pagination(dataRange.maxPageNumber, Math.min(pageNumber, dataRange.maxPageNumber))) {
    const itemObj = makeItem(item, { pageNumber, href: (pitem) => `${baseSubpath}/${pitem}` })
    paginationObj.items.push(itemObj)
  }

  return paginationObj
}
