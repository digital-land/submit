import axios from 'axios'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

const datasetteUrl = 'https://datasette.planning.data.gov.uk'

const requestInfo = Symbol.for('requestInfo')
const requestId = Symbol.for('reqId')

/**
 * @param {*} req
 * @param {string} query
 * @param {number} duration milliseconds
 * @returns {number | undefined}
 */
function saveFetchInfo (req, query, duration) {
  return req[requestInfo].logRequest(req, query, duration)
}

export default {
  /**
 * Executes a SQL query on the Datasette instance and returns the results.
 *
 * @param {string} query - The SQL query to execute.
 * @param {string} database - The name of the database to query. Defaults to 'digital-land'.
 * @param {{ req: import('express').Request} | undefined} opts - options
 * @returns {Promise<{data: object, formattedData: object[]}>} - A promise that resolves to an object with the following properties:
 *   - `data`: The raw data returned by Datasette.
 *   - `formattedData`: The formatted data, with columns and rows parsed into a usable format.
 * @throws {Error} If the query fails or there is an error communicating with Datasette.
 */
  runQuery: async (query, database = 'digital-land', opts = undefined) => {
    const req = opts?.req
    const encodedQuery = encodeURIComponent(query)
    const url = `${datasetteUrl}/${database}.json?sql=${encodedQuery}`
    const start = performance.now()
    try {
      const response = await axios.get(url)
      return {
        ...response.data,
        formattedData: formatData(response.data.columns, response.data.rows)
      }
    } catch (error) {
      logger.warn({ message: `runQuery(): ${error.message}`, type: types.App, query, datasetteUrl, database })
      throw error
    } finally {
      if (req) {
        const duration = performance.now() - start
        const reqId = req[requestId]
        if ('metric' in req.query) {
          logger.info('runQuery()', { type: types.Metric, reqId, duration, endpoint: req.originalUrl, database })
        }
        saveFetchInfo(req, query, duration)
      }
    }
  }
}

/**
 * Formats an array of rows into an easier to access format, where each row is an object with column names as keys.
 *
 * @param {string[]} columns - An array of column names
 * @param {any[][]} rows - A 2D array of row data, where each inner array represents a row
 * @returns {object[]} - An array of objects, where each object represents a row with column names as keys
 */
export function formatData (columns, rows) {
  // convert the rows into an easier to access format
  return rows.map((row) => {
    return row.reduce((acc, val, index) => {
      acc[columns[index]] = val
      return acc
    }, {})
  })
}
