/**
 * @module middleware-builders
 *
 * @description Middleware builders for data fetching, conditional execution, and template rendering.
 *
 * This file provides a set of reusable middleware functions and utility functions that
 * can be composed together to create custom workflows for a web application.
 * Includes functions for fetching data from a dataset, conditionally executing
 * middleware, and rendering templates with validation.
 */

import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { templateSchema } from '../routes/schemas.js'
import { render } from '../utils/custom-renderer.js'
import datasette from '../services/datasette.js'
import * as v from 'valibot'
import { errorTemplateContext, MiddlewareError } from '../utils/errors.js'
import config from '../../config/index.js'
import * as zlib from 'zlib'
import { commandOptions } from 'redis'

import { dataSubjects } from '../utils/utils.js'
import { getRedis } from '../serverSetup/session.js'
import { isFeatureEnabled } from '../utils/features.js'

const requestStart = Symbol.for('requestStart')
const requestId = Symbol.for('reqId')

const availableDatasets = Object.values(dataSubjects).flatMap((dataSubject) =>
  (dataSubject.dataSets || [])
    .filter((dataset) => dataset.available)
    .map((dataset) => dataset.value)
)

export const FetchOptions = {
  /**
     * Use 'dataset' from requets params.
     */
  fromParams: Symbol('from-params'),
  /**
   * Use the performance database
   */
  performanceDb: Symbol('performance-db')
}

const datasetOverride = (val, req) => {
  if (!val) {
    return 'digital-land'
  }
  if (val === FetchOptions.fromParams) {
    if (!('dataset' in req.params)) {
      logger.warn('no "dataset" in request params',
        { types: types.App, endpoint: req.originalUrl, params: req.params })
    }
    return req.params.dataset
  } else if (val === FetchOptions.performanceDb) {
    return 'performance'
  } else {
    return val(req)
  }
}

const fetchOneFallbackPolicy = (req, res, next) => {
  const err = new MiddlewareError('Not found', 404)
  res.status(err.statusCode).render(err.template, { ...errorTemplateContext(), err })
}

/**
     * Collection of fallback policies for the {@link fetchOneFn} middleware.
     * The policy is enacted when zero records is returned from the data source.
     */
export const FetchOneFallbackPolicy = {
  /**
       * Renders a 404 response.
       */
  'not-found-error': fetchOneFallbackPolicy,

  /**
       * Proceeds by calling `next()`.
       */
  continue: (_req, _res, next) => next()
}

/**
 * Middleware. Attempts to fetch data from datasette and short-circuits with 404 when
 * data for given query does not exist. Meant to be used to fetch singular records.
 *
 * `this` needs `{ query({ req, params }) => any, result: string, dataset?: FetchParams | (req) => string, fallbackPolicy: (req, res, next) => void }`
 *
 * where the `result` is the key under which result of the query will be stored in `req`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function fetchOneFn (req, res, next) {
  logger.debug({ type: types.DataFetch, message: 'fetchOne', resultKey: this.result })
  try {
    const query = this.query({ req, params: req.params })
    const result = await datasette.runQuery(query, datasetOverride(this.dataset, req), { req, resultKey: this.result })
    const fallbackPolicy = this.fallbackPolicy ?? FetchOneFallbackPolicy['not-found-error']
    if (result.formattedData.length === 0) {
      // we can make the 404 more informative by informing the use what exactly was "not found"
      fallbackPolicy(req, res, next)
    } else {
      req[this.result] = result.formattedData[0]
      next()
    }
  } catch (error) {
    logger.debug('fetchOne: failed', { type: types.DataFetch, errorMessage: error.message, endpoint: req.originalUrl, resultKey: this.result })
    req.handlerName = `fetching '${this.result}'`
    next(error)
  }
}

/**
   * Middleware. Attempts to fetch a collection of data from datasette.
   *
   * `this` needs `{ query( {req, params } ) => any, result: string, dataset?: FetchParams | (req) => string }`
   *
   * @param {*} req
   * @param {*} res
   * @param {*} next
   */
export async function fetchManyFn (req, res, next) {
  try {
    const query = this.query({ req, params: req.params })
    const result = await datasette.runQuery(query, datasetOverride(this.dataset, req), { req, resultKey: this.result })
    req[this.result] = result.formattedData
    logger.debug({ type: types.DataFetch, message: 'fetchMany', resultKey: this.result, resultCount: result.formattedData.length })
    next()
  } catch (error) {
    logger.debug('fetchMany: failed', { type: types.DataFetch, errorMessage: error.message, endpoint: req.originalUrl, resultKey: this.result })
    req.handlerName = `fetching '${this.result}'`
    next(error)
  }
}

/**
 * Middleware. Fetches one result from all available datasets.
 *
 * This function runs a query on each available dataset, catches any errors that may occur,
 * and then compiles the results into a single object. The result object is then attached to
 * the request object.
 *
 * @async
 * @function fetchOneFromAllDatasetsFn
 * @param {Object} req - The request object.
 * @param {Object} req.params - Route parameters.
 * @param {string} req.originalUrl - The original URL of the request.
 * @param {string} req.handlerName - A property to store the name of the handler.
 * @param {function} req.query - A function to construct a query based on the request parameters.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function in the stack.
 * @throws {Error} If any of the queries fail.
 */
export async function fetchOneFromAllDatasetsFn (req, res, next) {
  try {
    const query = this.query({ req, params: req.params })
    const promises = availableDatasets.map((dataset) => {
      return datasette.runQuery(query, dataset, { req, resultKey: this.result }).catch(error => {
        logger.error('Query failed for dataset', { dataset, errorMessage: error.message, errorStack: error.stack, type: types.DataFetch })
        throw error
      })
    })
    const result = await Promise.all(promises)
    req[this.result] = Object.fromEntries(
      result.reduce((acc, { formattedData }, i) => {
        if (formattedData.length > 0) {
          acc.push([availableDatasets[i], formattedData[0]])
        }
        return acc
      }, [])
    )
    logger.debug({ type: types.DataFetch, message: 'fetchOneFromAllDatasets', resultKey: this.result })
    next()
  } catch (error) {
    logger.debug('fetchOneFromAllDatasetsFn: failed', { type: types.DataFetch, errorMessage: error.message, endpoint: req.originalUrl, resultKey: this.result })
    req.handlerName = `fetching '${this.result}'`
    next(error)
  }
}

/**
 * Fetches data from all available datasets and stores the result in the request object.
 *
 * @async
 * @function fetchManyFromAllDatasetsFn
 * @param {Object} req - The request object.
 * @param {string} req.params - The URL parameters for the request.
 * @param {string} req.originalUrl - original URL
 * @param {string} [req.handlerName] - value set in this fn
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function in the chain.
 * @returns {Promise<*>}
 * @throws {Error} If an error occurs while fetching data from any of the datasets.
 */
export async function fetchManyFromAllDatasetsFn (req, res, next) {
  try {
    const query = this.query({ req, params: req.params })
    const promises = availableDatasets.map((dataset) => {
      return datasette.runQuery(query, dataset, { req, resultKey: this.result }).catch(error => {
        logger.error('Query failed for dataset', { dataset, errorMessage: error.message, errorStack: error.stack, type: types.DataFetch })
        throw error
      })
    })
    const result = await Promise.all(promises)
    req[this.result] = Object.fromEntries(
      result.filter(({ formattedData }) => formattedData.length > 0)
        .map(({ formattedData }, i) => [availableDatasets[i], formattedData])
    )
    logger.debug({ type: types.DataFetch, message: 'fetchManyFromAllDatasets', resultKey: this.result })
    next()
  } catch (error) {
    logger.debug('fetchManyFromAllDatasetsFn: failed', { type: types.DataFetch, errorMessage: error.message, endpoint: req.originalUrl, resultKey: this.result })
    req.handlerName = `fetching '${this.result}'`
    next(error)
  }
}

/**
   * Middleware. Does a conditional fetch. Optionally invokes `else` if condition is false.
   *
   * `this` needs: `{ fetchFn, condition: (req) => boolean, else?: (req) => void }`
   *
   * `fetchFn` should be a middleware fn. Can be async.
   *
   * @param {*} req
   * @param {*} res
   * @param {*} next
   */
async function fetchIfFn (req, res, next) {
  if (this.condition(req)) {
    // `next` will be called in our fetchFn middleware
    const result = this.fetchFn(req, res, next)
    if (result instanceof Promise) {
      await result
    }
  } else {
    if (this.else) {
      this.else(req)
    }
    next()
  }
}

/**
 * Returns a middleware that will fetch data if condition is satisfied,
 * invoke `elseFn` otherwise.
 *
 * @param {Function} condition - Predicate function that takes a request object and returns a boolean
 * @param {Function} fetchFn - Fetch middleware function
 * @param {Function} [elseFn] - Optional function to call if condition is not met
 * @returns {Function} Middleware function
 * @function
 */
export const fetchIf = (condition, fetchFn, elseFn = undefined) => {
  return fetchIfFn.bind({
    condition, fetchFn, else: elseFn
  })
}

/**
 * @typedef {Object} QueryContext
 * @property {Function} query - Function that takes req and params and returns query object
 * @property {string} result - Key to store result under in req
 * @property {Symbol} [dataset] - how to get the dataset name, see {@link FetchOptions}
 * @property {Function} [context.fallbackPolicy] - Custom fallback policy for zero results
 */

/**
 * Fetches a single entity and stores it in `req` under key specified by `result` entry.
 *
 * Use `fallbackPolicy` to handle zero record responses differently than the default 404 response.
 * See {@link FetchOneFallbackPolicy}
 *
 * @param {QueryContext} context - Configuration object
 * @returns {Function} Middleware function
 */
export function fetchOne (context) {
  return fetchOneFn.bind(context)
}

/**
 * Fetches a collection of records and stores them in `req` under key specified by `result` entry.
 *
 * @param {QueryContext} context - Configuration object
 * @returns {Function} Middleware function
 */
export function fetchMany (context) {
  return fetchManyFn.bind(context)
}

/**
 * Fetches a single record from each dataset databases and stores them in `req` under key specified by `result` entry.
 *
 * @param {QueryContext} context - Configuration object
 * @returns {Function} Middleware function
 */
export function fetchOneFromAllDatasets (context) {
  return fetchOneFromAllDatasetsFn.bind(context)
}

/**
 * Fetches a collection of records from all dataset databases and stores them in `req` under key specified by `result` entry.
 *
 * @param {QueryContext} context - Configuration object
 * @returns {Function} Middleware function
 */
export function fetchManyFromAllDatasets (context) {
  return fetchManyFromAllDatasetsFn.bind(context)
}

/**
 * Looks up schema for name in {@link templateSchema} (defaults to any()), validates and renders the template.
 *
 * @param {import('express').Response} res response object
 * @param {string} name
 * @param {*} params template params
 * @returns {string}
 */
export function validateAndRender (res, name, params) {
  const schema = templateSchema.get(name) ?? v.any()
  logger.info(
        `rendering '${name}' with schema=<${schema ? 'defined' : 'any'}>`,
        { type: types.App }
  )
  return render(res, name, schema, params)
}

/**
 * Middleware. Validates and renders the template.
 *
 * `this` needs: `{ templateParams(req), template,  handlerName }`
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
export function renderTemplateFn (req, res, next) {
  const templateParams = this.templateParams(req)
  const reqId = req[requestId]
  try {
    validateAndRender(res, this.template, templateParams)
    logger.info('rendered', { type: types.App, id: reqId, template: this.template })
  } catch (err) {
    req.handlerName = this.handlerName
    next(err)
  } finally {
    const reqStart = req[requestStart]
    if (reqStart) {
      logger.debug({ type: types.Metric, message: 'request duration', duration: performance.now() - reqStart, id: reqId })
    }
  }
}

/**
 * Validates and renders the template.
 *
 * @param {Object} context - Configuration object
 * @param {Function} context.templateParams - Function that returns template parameters
 * @param {string} context.template - Template name
 * @param {string} context.handlerName - Handler name
 * @returns {Function} Express middleware function
 */
export function renderTemplate (context) {
  return renderTemplateFn.bind(context)
}

/**
 * Returns a middleware that executes the given sub-middlewares in parallel
 * and waits for all of them to complete.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Promise<undefined>}
 */
async function parallelFn (req, res, next) {
  const fns = this.middlewares
  const nextParams = []
  const nextFn = (val) => {
    if (val) nextParams.push(val)
  }
  // We need to take care of explicit `next(value)`, so we hijack the 'next' callback.
  // We also need to hadle any rejected promises in results
  const results = await Promise.allSettled(fns.map(fn => fn(req, res, nextFn)))
  /* eslint-disable no-unreachable-loop */
  for (const param of nextParams) {
    if (param instanceof Error) {
      logger.debug('parallel: captured a "next" error', { type: types.App, errorMessage: param.message })
    }
    next(param)
    return
  }
  for (const result of results) {
    if (result.status === 'rejected') {
      logger.debug('parallel: got a rejected promise', { type: types.App })
      next(result.reason)
      return
    }
  }

  next()
}

/**
 * Returns a middleware that invokes the passed middlewares in parallel.
 *
 * Usage: when all sub-middlewre can be fetched independently, but we can't accept a partial success
 * (e.g. we require all middlewares to succeed).
 *
 * @param {Function[]} middlewares - Array of middleware functions
 * @returns {Function} Express middleware function that returns a Promise
 */
export function parallel (middlewares) {
  return parallelFn.bind({ middlewares })
}

export const onlyIf = (condition, middlewareFn) => {
  return async (req, res, next) => {
    if (condition(req)) {
      const result = middlewareFn(req, res, next)
      if (result instanceof Promise) {
        await result
      }
    } else {
      next()
    }
  }
}

async function safeFn (req, res, next) {
  try {
    await this.middleware(req, res, next)
  } catch (err) {
    next(err)
  }
}

/**
 * Express 4.x does not handle promise rejections in middleware on its own. The
 * {@fetchOne} and {@fetchMany} middleware handle that case but for any other async
 * code you can wrap it in this middleware to ensure rejections don't end up unhandled.
 *
 * @param middleware
 * @returns {any}
 */
export const handleRejections = (middleware) => {
  return safeFn.bind({ middleware })
}

async function cachedFn (req, res, next) {
  const client = getRedis()
  const resultKey = this.resultKey
  const key = this.key(req, resultKey)
  const compressed = await client.get(commandOptions({ returnBuffers: true }), key)
  if (compressed) {
    logger.info({ message: 'cache hit', key, id: req[requestId], resultKey })
    const decompressed = zlib.brotliDecompressSync(compressed)
    const jsonString = decompressed.toString('utf8')
    const deserialised = JSON.parse(jsonString)
    req[resultKey] = deserialised
  }

  if (req[resultKey]) {
    next()
  } else {
    logger.debug({ message: 'cache miss', key, id: req[requestId], resultKey })
    const error = await new Promise((resolve, reject) => {
      this.middleware(req, res, resolve)
    })
    if (error) {
      next(error)
    } else {
      const val = req[resultKey]
      if (val) {
        const serialised = JSON.stringify(val)
        const compressed = zlib.brotliCompressSync(serialised)
        client.set(key, compressed)
      }
      next()
    }
  }
}

const cachingEnabled = isFeatureEnabled('datasetteCaching')

/**
 * Returns a middleware wchich wraps a data fetch with a Redis cache lookup/store.
 *
 * @param {Object} opts options
 * @param {Function} opts.middleware fetch middlware
 * @param {string} opts.resultKey key used by the fetch middleware to store results in `req` object
 * @param {Function} opts.key function returning the cache key `(req, resultKey) => string`
 * @returns
 */
export const cached = (opts) => {
  if (cachingEnabled && 'redis' in config) {
    return cachedFn.bind(opts)
  }

  return opts.middleware
}
