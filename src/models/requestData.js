import logger from '../utils/logger.js'
import axios from 'axios'
import config from '../../config/index.js'

export default class RequestData {
  constructor (response) {
    Object.assign(this, response)
  }

  async fetchResponseDetails (pageNumber = 0, limit = 50, severity = undefined) {
    const urlParams = new URLSearchParams()
    urlParams.append('offset', pageNumber * limit)
    urlParams.append('limit', limit)
    if (severity) {
      urlParams.append('jsonpath', `$.issue_logs[*].severity=="${severity}"`)
    }

    const request = await axios.get(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${this.id}/response-details?${urlParams.toString()}`, { timeout: 30000 })
    this.response.details = request.data

    this.pagination = {
      totalResults: request.headers['x-pagination-total-results'],
      offset: request.headers['x-pagination-offset'],
      limit: request.headers['x-pagination-limit']
    }
  }

  isFailed () {
    return this.status === 'FAILED'
  }

  getError () {
    if (!this.response) {
      logger.error('trying to get error when there are none: request id: ' + this.id)
      return { message: 'An unknown error occurred.' }
    }

    return this.response.error
  }

  hasErrors () {
    if (!this.response || !this.response.data) {
      logger.error('trying to check for errors when there are none: request id: ' + this.id)
      return true
    }
    if (this.response == null) {
      return true
    }
    if (this.response.data == null) {
      return true
    }
    if (this.response.data['error-summary'] == null) {
      return true
    }
    return this.response.data['error-summary'].length > 0
  }

  isComplete () {
    const finishedProcessingStatuses = ['COMPLETE', 'FAILED']
    return finishedProcessingStatuses.includes(this.status)
  }

  getParams () {
    return this.params
  }

  getId () {
    return this.id
  }

  getPagination (pageNumber) {
    pageNumber = parseInt(pageNumber)
    const totalPages = Math.ceil(this.pagination.totalResults / this.pagination.limit)

    const items = pagination(totalPages, pageNumber + 1).map(item => {
      if (item === '...') {
        return {
          ellipsis: true,
          href: '#'
        }
      } else {
        return {
          number: item,
          href: `/results/${this.id}/${parseInt(item) - 1}`,
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
}

const { min, max } = Math
const range = (lo, hi) => Array.from({ length: hi - lo }, (_, i) => i + lo)

export const pagination = (count, current, ellipsis = '...') => {
  if (count <= 5) {
    return range(1, count + 1)
  }
  const adjacent = 1
  const left = current === count ? current - 2 * adjacent : max(0, current - adjacent)
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
