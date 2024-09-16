import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { templateSchema } from '../routes/schemas.js'
import { render } from '../utils/custom-renderer.js'
import datasette from '../services/datasette.js'
import * as v from 'valibot'

export const FetchOptions = {
  /**
   * Use 'dataset' from requets params.
   */
  fromParams: Symbol('from-params')
}

const datasetOverride = (val, req) => {
  if (!val) {
    return 'digital-land'
  }
  if (val === FetchOptions.fromParams) {
    console.assert(req.params.dataset, 'no "dataset" in request params')
    return req.params.dataset
  } else {
    return val(req)
  }
}

/**
 * Middleware. Attempts to fetch data from datasette and short-circuits with 404 when
 * data for given query does not exist. Meant to be used to fetch singular records.
 *
 * `this` needs `{ query({ req, params }) => any, result: string, dataset?: FetchParams | (req) => string }`
 *
 * where the `result` is the key under which result of the query will be stored in `req`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function fetchOne (req, res, next) {
  logger.debug({ type: types.DataFetch, message: 'fetchOne', resultKey: this.result })
  try {
    const query = this.query({ req, params: req.params })
    const result = await datasette.runQuery(query, datasetOverride(this.dataset, req))
    if (result.formattedData.length === 0) {
      // we can make the 404 more informative by informing the use what exactly was "not found"
      res.status(404).render('errorPages/404', {})
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
export async function fetchMany (req, res, next) {
  try {
    const query = this.query({ req, params: req.params })
    const result = await datasette.runQuery(query, datasetOverride(this.dataset, req))
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
export async function maybeFetch (req, res, next) {
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
 * Middleware. Set `req.handlerName` to a string that will identify
 * the function that threw the error.
 *
 * @param {Error} err
 * @param {{handlerName: string}} req
 * @param {*} res
 * @param {*} next
 */
export const logPageError = (err, req, res, next) => {
  console.assert(req.handlerName, 'handlerName missing ')
  logger.warn({
    message: `OrganisationsController.${req.handlerName}(): ${err.message}`,
    endpoint: req.originalUrl,
    errorStack: err.stack,
    errorMessage: err.message,
    type: types.App
  })
  next(err)
}

/**
 * Looks up schema for name in @{link templateSchema} (defaults to any()), validates and renders the template.
 *
 * @param {*} res
 * @param {string} name
 * @param {*} params
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
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export function renderTemplate (req, res, next) {
  const templateParams = this.templateParams(req)
  try {
    validateAndRender(res, this.template, templateParams)
  } catch (err) {
    req.handlerName = this.handlerName
    next(err)
  }
}

export const fetchIf = (condition, fetchFn) => {
  return maybeFetch.bind({
    condition, fetchFn
  })
}

async function parallelFn (req, res, next) {
  const fns = this.middlewares
  const nextParams = []
  const nextFn = (val) => {
    if (val) nextParams.push(val)
  }
  // We need to take care of explicit `next(value)`, so we hijack the 'next' callback.
  // We also need to hadle any rejected promises in results
  const results = await Promise.allSettled(fns.map(fn => fn(req, res, nextFn)))
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
 * @param {((req,res,next) => void)[]} middlewares array of middleware functions
 * @returns {(req, res, next) => Promise<void>}
 */
export function parallel (middlewares) {
  return parallelFn.bind({ middlewares })
}
