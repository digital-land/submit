import * as v from 'valibot'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import axios from 'axios'
import config from '../../config/index.js'
import ResponseDetails from './responseDetails.js'

const ResponseDetailsOptions = v.optional(v.object({
  severity: v.optional(v.pipe(v.string(), v.minLength(2))),
  issue: v.optional(v.object({
    issueType: v.pipe(v.string(), v.minLength(1)),
    field: v.pipe(v.string(), v.minLength(1))
  }))
}))

/**
 * Holds response data of 'http://ASYNC-REQUEST-API-HOST/requests/:result-id' endpoint.
 *
 * Allows to get the result details by invoking {@link fetchResponseDetails}
 */
export default class ResultData {
  constructor (responseData) {
    Object.assign(this, responseData)
  }

  /**
   * Fetches check results details, optionally filtered by issue (type and field), or severity (but not both).
   *
   * @param {number} [pageOffset=0] - Zero based page offset
   * @param {number} [limit=50] - Results per page limit
   * @param {Object} [opts] - Filter options
   * @param {string} [opts.severity] - Filter by severity
   * @param {Object} [opts.issue] - Filter by issue
   * @param {string} [opts.issue.issueType] - Issue type to filter by
   * @param {string} [opts.issue.field] - Field to filter by
   * @returns {Promise<ResponseDetails>} Response details
   */
  async fetchResponseDetails (pageOffset = 0, limit = 50, opts = { severity: undefined }) {
    v.parse(ResponseDetailsOptions, opts)

    const url = new URL(`${config.asyncRequestApi.url}/${config.asyncRequestApi.requestsEndpoint}/${this.id}/response-details`)
    url.searchParams.append('offset', pageOffset * limit)
    url.searchParams.append('limit', limit)
    if ('issue' in opts) {
      const { issueType, field } = opts.issue
      // 'missing column' is an issue type we made up: the Request API does not use it, so we can't filter by that value
      if (issueType !== 'missing column') {
        url.searchParams.append('jsonpath', `$.issue_logs[*]."issue-type"=="${issueType}" && $.issue_logs[*]."field"=="${field}"`)
      }
    } else if (opts.severity) {
      url.searchParams.append('jsonpath', `$.issue_logs[*].severity=="${opts.severity}"`)
    }

    // we do initial request, check how many records there are via 'x-pagination-total-results' header
    // and if fetch the rest if needed
    const response = await axios.get(url, { timeout: 30000 })
    const totalResults = Number.parseInt(response.headers['x-pagination-total-results'])
    const responses = [...response.data]
    if (Number.isInteger(totalResults) && totalResults > response.data.length) {
      const urlTemplate = new URL(url)
      urlTemplate.searchParams.delete('offset')
      urlTemplate.searchParams.delete('limit')

      const paginationOpts = { limit, offset: response.data.length, maxOffset: Number.isInteger(totalResults) ? totalResults : 100 }
      const restResponses = await fetchPaginated(url, paginationOpts)
      responses.push(...restResponses.flatMap(resp => resp.data))
    }

    // we're not using x-pagination-offset and x-pagination-limit headers, because we fetched
    // all the records already, so there's no need for pagination controls on the table
    const pagination = {
      totalResults: `${totalResults}`,
      offset: '0',
      limit: `${totalResults}`
    }

    return new ResponseDetails(this.id, responses, pagination, this.getColumnFieldLog())
  }

  isFailed () {
    return this.status === 'FAILED'
  }

  getType () {
    return this.type
  }

  getError () {
    if (!this.response) {
      logger.warn('trying to get error when there are none', { requestId: this.id })
      return { message: 'An unknown error occurred.' }
    }

    return this.response.error
  }

  hasErrors () {
    if (!this.response || !this.response.data) {
      logger.warn('trying to check for errors when there are none', { requestId: this.id })
      return true
    }
    if (this.response.data['error-summary'] == null) {
      logger.warn('trying to check for errors but there is no error-summary', { requestId: this.id })
      return true
    }
    return this.response.data['error-summary'].length > 0
  }

  isComplete () {
    const finishedProcessingStatuses = ['COMPLETE', 'FAILED']
    return finishedProcessingStatuses.includes(this.status)
  }

  /**
   *
   * @returns {any[]}
   */
  getColumnFieldLog () {
    if (!this.response || !this.response.data || !this.response.data['column-field-log']) {
      logger.warn('trying to get column field log when there is none', { requestId: this.id })
      return []
    }
    return this.response.data['column-field-log']
  }

  getParams () {
    return this.params
  }

  getId () {
    return this.id
  }
}

/**
 * Returns a generator of offset values.
 *
 * @param {number} limit
 * @param {number} offset
 * @param {number} maxOffset
 */
function * offsets (limit, offset, maxOffset) {
  let currentOffset = offset
  while (currentOffset < maxOffset) {
    yield currentOffset
    currentOffset += limit
  }
}

/**
 *
 * @param {number} numTasks max number of tasks to run
 * @param {Object} gen offset generator
 * @param {Function} taskFactory (taskIndex, offset) => Promise<>
 * @returns {Promise[]}
 */
function startRequests (numTasks, gen, taskFactory) {
  const tasks = []
  for (let i = 0; i < numTasks; ++i) {
    const offsetItem = gen.next()
    if (!offsetItem.done) {
      const p = taskFactory(i, offsetItem.value)
      tasks.push(p)
    } else {
      break
    }
  }
  return tasks
}

/**
 * Given a task factor function, executes a number of async tasks in parallel,
 * but only at most `options.concurrency` tasks are in flight.
 *
 * Note: the tasks should be IO bound.
 *
 * If any of the tasks fail, the whole operation fails (in other words:
 * no partial results).
 *
 * @param {Object} options
 * @returns {Promise<Object[][]>}
 */
async function fetchBatched (options) {
  // Note: trying more involved strategy of launching requests by using Promise.any()
  // and trying to immedieately replace that one completed promise with a new one
  // didn't really behave as expected - work was happening mostly in a single promise.
  // This one's simpler and seems to actually do what expected.
  const { concurrency, taskFn, offsetInfo } = options
  const results = []
  const gen = offsets(offsetInfo.limit, offsetInfo.offset, offsetInfo.maxOffset)
  const newTask = async (index, offset) => {
    logger.debug('fetchBatched(): starting task', { task: index, offset, type: types.DataFetch })
    const p = taskFn(offset).then((val) => {
      logger.debug('fetchBatched(): finishing task', { task: index, offset, type: types.DataFetch })
      return { val, index, offset }
    })
    return p
  }

  let promises = startRequests(concurrency, gen, newTask)

  do {
    const completed = await Promise.all(promises)
    results.push(...completed)
    promises = startRequests(concurrency, gen, newTask)
    logger.debug(`fetchBatched(): completed ${completed.length} tasks`, { type: types.DataFetch })
  } while (promises.length > 0)

  logger.info(`fetchBatched(): completed ${results.length} requests`, { type: types.DataFetch })
  results.sort((r1, r2) => r1.offset - r2.offset)
  return results.map(r => r.val)
}

/**
 *
 * @param {URL} url url
 * @param {Object} options
 * @returns {Promise<Object[]>}
 */
export const fetchPaginated = async (url, { limit, offset, maxOffset }) => {
  const taskFn = async (offset) => {
    const thisUrl = new URL(url)
    thisUrl.searchParams.set('offset', offset)
    thisUrl.searchParams.set('limit', limit)
    const result = await axios.get(thisUrl, { timeout: 10000 })
    return result
  }

  return await fetchBatched({ concurrency: 4, taskFn, offsetInfo: { limit, offset, maxOffset } })
}
