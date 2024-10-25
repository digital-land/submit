import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { fetchOne, FetchOptions, FetchOneFallbackPolicy, fetchMany, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

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

export const fetchDatasetInfo = fetchOne({
  query: ({ params }) => {
    return `SELECT name, dataset, collection FROM dataset WHERE dataset = '${params.dataset}'`
  },
  result: 'dataset'
})

/**
 * Was the resource accessed successfully via HTTP?
 *
 * @param {*} req
 * @returns {boolean}
 */
export const isResourceAccessible = (req) => req.resourceStatus.status === '200'
export const isResourceIdValid = (req) => req.resourceStatus.resource.trim() !== ''
export const isResourceNotAccessible = (req) => !isResourceAccessible(req)
export const isResourceIdInParams = ({ params }) => !('resourceId' in params)
export const isResourceDataPresent = (req) => 'resource' in req

export const and = (...args) => {
  return (req) => args.every(arg => arg(req))
}
export const or = (...args) => {
  return (req) => args.some(arg => arg(req))
}

/**
 * Middleware. Updates req with `resource`.
 */
export const fetchLatestResource = fetchOne({
  query: ({ params }) => performanceDbApi.latestResourceQuery(params.lpa, params.dataset),
  result: 'resource',
  fallbackPolicy: FetchOneFallbackPolicy.continue
})

export const takeResourceIdFromParams = (req) => {
  logger.debug('skipping resource fetch', { type: types.App, params: req.params })
  req.resource = { resource: req.params.resourceId }
}

export const fetchEntityCount = fetchOne({
  query: ({ req }) => performanceDbApi.entityCountQuery(req.resource.resource),
  result: 'entityCount',
  dataset: FetchOptions.fromParams,
  fallbackPolicy: FetchOneFallbackPolicy.continue
})

export const fetchOrgInfo = fetchOne({
  query: ({ params }) => {
    return `SELECT name, organisation, entity, statistical_geography FROM organisation WHERE organisation = '${params.lpa}'`
  },
  result: 'orgInfo'
})

/**
 * Middleware. Validates query params according to schema.
 * Short circuits with 400 error if validation fails
 *
 * `this` needs: `{ schema }`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export function validateQueryParamsFn (req, res, next) {
  try {
    v.parse(this.schema || v.any(), req.params)
    next()
  } catch (error) {
    res.status(400).render('errorPages/400', {})
  }
}

export function validateQueryParams (context) {
  return validateQueryParamsFn.bind(context)
}

export const fetchLpaDatasetIssues = fetchMany({
  query: ({ params, req }) => performanceDbApi.datasetIssuesQuery(req.resourceStatus.resource, params.dataset),
  result: 'issues'
})

export const getDatasetTaskListError = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/http-error.html',
  handlerName: 'getDatasetTaskListError'
})
