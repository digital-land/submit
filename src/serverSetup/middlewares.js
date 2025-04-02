import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import hash from '../utils/hasher.js'
import config from '../../config/index.js'
import { preventIndexing } from '../middleware/common.middleware.js'
import { MiddlewareError, errorTemplateContext } from '../utils/errors.js'
import { v4 as uuidv4 } from 'uuid'
import { isFeatureEnabled } from '../utils/features.js'

const requestInfoStoreEnabled = isFeatureEnabled('requestInfoStore')

const requestId = Symbol.for('reqId')
const requestInfo = Symbol.for('requestInfo')
const requestStart = Symbol.for('requestStart')

/**
 * @type {Map<string, { url: string, id: string, query: string, duration: number, size: number }[]>}
 */
const store = new Map()

const makeRequestInfoConsumer = (storage) => {
  return {
    /**
     * @param {{url: string, id: string}} info request info
     * @returns {number} index in the array of queries for the request
     */
    log (info) {
      let fetches = storage.get(info.id)
      if (fetches) {
        fetches.push(info)
      } else {
        fetches = [info]
        storage.set(info.id, fetches)
      }
      return fetches.length - 1
    },
    /**
     *
     * @param {import('express').Request} req
     * @param {Object} payload
     * @param {string} payload.query
     * @param {string} payload.resultKey key used to store query results
     * @param {number} payload.duration milliseconds
     * @param {number} payload.size in bytes
     * @param {number} payload.compressed in bytes
     * @returns {number} index in the array of queries for the request
     */
    logRequest (req, { query, duration, size, compressed, resultKey }) {
      const id = req[requestId]
      const info = {
        id,
        url: req.originalUrl,
        query,
        result_key: resultKey,
        duration: Math.floor(duration),
        size,
        compressed
      }
      return this.log(info)
    }
  }
}

const makeNoopRequestInfoConsumer = () => {
  return {
    log (info) {},
    logRequest (req, query, duration, size) {}
  }
}

function addRequestId (req, res, next) {
  req[requestId] = uuidv4()
  req[requestInfo] = requestInfoStoreEnabled ? makeRequestInfoConsumer(store) : makeNoopRequestInfoConsumer()
  req[requestStart] = performance.now()
  next()
}

/**
 * Middleware. Allows to fethch request info. This is a develpment aid and should not
 * be enabled in production as the store grows unbounded. The endpoint returns
 * JSON object of UUID -> { id, url, query }[].
 */
const requestInfoRoute = async (req, res, next) => {
  const jsonBody = {}
  for (const [k, v] of store.entries()) {
    jsonBody[k] = v
  }
  res.json(jsonBody)
}

export function setupMiddlewares (app) {
  app.use(addRequestId)
  app.use((req, res, next) => {
    const obj = {
      type: types.Request,
      method: req.method,
      endpoint: req.originalUrl,
      id: req[requestId],
      message: '◦' // we need to put something here or watson will use an obj as the message
    }
    if (req.sessionID) {
      obj.sessionId = hash(req.sessionID)
    }
    logger.info(obj)
    next()
  })

  if (requestInfoStoreEnabled) {
    app.use('/request-info', requestInfoRoute)
  }

  app.use('/assets', express.static('./node_modules/govuk-frontend/dist/govuk/assets'))
  app.use('/assets', express.static('./node_modules/@x-govuk/govuk-prototype-components/x-govuk'))
  app.use('/public', express.static('./public'))
  app.use('/robots.txt', express.static('./robots.txt'))

  app.use(cookieParser())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(preventIndexing)

  app.use((req, res, next) => {
    const serviceDown = config.maintenance.serviceUnavailable || false
    if (serviceDown) {
      const err = new MiddlewareError('Service unavailable', 503)
      res.status(err.statusCode).render(err.template, { ...errorTemplateContext(), err, uptime: config.maintenance.upTime })
    } else {
      next()
    }
  })
}
