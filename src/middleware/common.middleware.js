import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { fetchOne, FetchOptions, FetchOneFallbackPolicy, fetchMany, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'
import { pagination } from '../utils/pagination.js'

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
 * Short circuits with 400 error if validation fails. Potentially updates req with `parsedParams`
 *
 * `this` needs: `{ schema }`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export function validateQueryParamsFn (req, res, next) {
  try {
    req.parsedParams = v.parse(this.schema || v.any(), req.params)
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

export const getIsPageNumberInRange = (maxPagesKey) => {
  /**
   * Middleware. Short-circuits with 404 error if pageNumber is not in range.
   * Updates req with `pageNumber`
   *
   * @param req
   * @param res
   * @param next
   */
  return (req, res, next) => {
    const { pageNumber } = req.parsedParams
    if (!Number.isInteger(pageNumber)) {
      res.status(400).render('errorPages/400', {})
      return
    }
    if (pageNumber < 1 || req[maxPagesKey] < pageNumber) {
      res.status(404).render('errorPages/404', {})
      return
    }
    next()
  }
}

/**
 * Creates pagination template parameters for the request.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function in the chain.
 *
 * @description
 * This middleware function extracts pagination-related parameters from the request,
 * calculates the total number of pages, and creates a pagination object that can be used
 * to render pagination links in the template.
 *
 * @returns {void}
 */
export const createPaginationTemplateParams = (req, res, next) => {
  const { resultsCount, urlSubPath, paginationPageLength } = req
  if (typeof resultsCount !== 'number' || typeof paginationPageLength !== 'number' || !urlSubPath) {
    logger.error('Missing or invalid pagination parameters', { resultsCount, urlSubPath, paginationPageLength })
    return next(new Error('Invalid pagination parameters'))
  }
  let { pageNumber } = req.params
  pageNumber = parseInt(pageNumber)

  if (isNaN(pageNumber) || pageNumber <= 0) {
    throw new Error('Invalid page number')
  }

  if (resultsCount <= 0) {
    return next()
  }

  const totalPages = Math.floor(resultsCount / paginationPageLength)

  const paginationObj = {}
  if (pageNumber > 1) {
    paginationObj.previous = {
      href: `${urlSubPath}${pageNumber - 1}`
    }
  }

  if (pageNumber < totalPages) {
    paginationObj.next = {
      href: `${urlSubPath}${pageNumber + 1}`
    }
  }

  paginationObj.items = pagination(totalPages, pageNumber).map(item => {
    if (item === '...') {
      return {
        type: 'ellipsis',
        ellipsis: true,
        href: '#'
      }
    } else {
      return {
        type: 'number',
        number: item,
        href: `${urlSubPath}${item}`,
        current: pageNumber === parseInt(item)
      }
    }
  })

  req.pagination = paginationObj

  next()
}

export const addDatabaseFieldToSpecification = (req, res, next) => {
  const { specification, fieldMappings } = req

  req.specification.fields = specification.fields.flatMap(fieldObj => {
    if (['GeoX', 'GeoY'].includes(fieldObj.field)) { // special case for brownfield land
      return { datasetField: 'point', ...fieldObj }
    }

    const fieldMappingsForField = fieldMappings.filter(mapping => mapping.field === fieldObj.field)

    const datasetFields = fieldMappingsForField.map(mapping => mapping.replacement_field).filter(Boolean)

    if (datasetFields.length === 0) {
      // no dataset fields found, add the field anyway with datasetField set to the same value as fieldObj.field
      return { datasetField: fieldObj.field, ...fieldObj }
    }

    // sometimes a field maps to more than one dataset field, so we need to account for that
    const specificationEntriesWithDatasetFields = datasetFields.map(datasetField => ({ datasetField, ...fieldObj }))
    return specificationEntriesWithDatasetFields
  })

  next()
}

export const replaceUnderscoreInSpecification = (req, res, next) => {
  req.specification.fields = req.specification.fields.map((spec) => {
    if (spec.datasetField) {
      spec.datasetField = spec.datasetField.replace(/_/g, '-')
    }
    return spec
  })

  next()
}

export const pullOutDatasetSpecification = (req, res, next) => {
  const { specification } = req
  let collectionSpecifications
  try {
    collectionSpecifications = JSON.parse(specification.json)
  } catch (error) {
    logger.error('Invalid JSON in specification.json', { error })
    return next(new Error('Invalid specification format'))
  }
  const datasetSpecification = collectionSpecifications.find((spec) => spec.dataset === req.dataset.dataset)
  if (!datasetSpecification) {
    logger.error('Dataset specification not found', { dataset: req.dataset.dataset })
    return next(new Error('Dataset specification not found'))
  }
  req.specification = datasetSpecification
  next()
}

export const extractJsonFieldFromEntities = (req, res, next) => {
  const { entities } = req

  req.entities = entities.map(entity => {
    const jsonField = entity.json
    if (!jsonField || jsonField === '') {
      logger.info(`common.middleware/extractJsonField: No json field for entity ${entity.toString()}`)
      return entity
    }
    entity.json = undefined
    try {
      const parsedJson = JSON.parse(jsonField)
      entity = Object.assign({}, parsedJson, entity)
    } catch (err) {
      logger.warn(`common.middleware/extractJsonField: Error parsing JSON for entity ${entity.toString()}: ${err.message}`)
    }
    return entity
  })

  next()
}

export const replaceUnderscoreInEntities = (req, res, next) => {
  if (!req.entities) {
    next()
    return
  }

  req.entities = req.entities.map((entity) => {
    return Object.keys(entity).reduce((acc, key) => {
      const newKey = key.replace(/_/g, '-')
      acc[newKey] = entity[key]
      return acc
    }, {})
  })

  next()
}

export const setDefaultParams = (req, res, next) => {
  if (!req.parsedParams) {
    return next()
  }

  Object.keys(req.parsedParams).forEach((key) => {
    req.params[key] = req.parsedParams[key]
  })

  next()
}
