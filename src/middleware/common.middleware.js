import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { fetchOne, FetchOptions, FetchOneFallbackPolicy, fetchMany } from './middleware.builders.js'
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
export const isResourceNotAccessible = (req) => !isResourceAccessible(req)
export const isResourceIdNotInParams = ({ params }) => !('resourceId' in params)

/**
 * Middleware. Updates req with `resource`.
 */
export const fetchLatestResource = fetchOne({
  query: ({ params }) => performanceDbApi.latestResourceQuery(params.lpa, params.dataset),
  result: 'resource'
})

export const takeResourceIdFromParams = (req) => {
  logger.debug('skipping resource fetch', { type: types.App, params: req.params })
  req.resource = { resource: req.params.resourceId }
}

export const fetchEntityCount = fetchOne({
  query: ({ req }) => performanceDbApi.entityCountQuery(req.orgInfo.entity),
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
export function validateQueryParams (req, res, next) {
  try {
    v.parse(this.schema || v.any(), req.params)
    next()
  } catch (error) {
    res.status(400).render('errorPages/400', {})
  }
}

export const fetchLpaDatasetIssues = fetchMany({
  query: ({ params, req }) => performanceDbApi.datasetIssuesQuery(req.resourceStatus.resource, params.dataset),
  result: 'issues'
})

export const fetchSpecification = fetchOne({
  query: ({ req }) => `select * from specification WHERE specification = '${req.dataset.collection}'`,
  result: 'specification'
})

export const pullOutDatasetSpecification = (req, res, next) => {
  const { specification } = req
  const collectionSpecifications = JSON.parse(specification.json)
  const datasetSpecification = collectionSpecifications.find((spec) => spec.dataset === req.dataset.dataset)
  req.specification = datasetSpecification
  next()
}

/**
 *
 * Middleware. Updates `req` with `issueEntitiesCount` which is the count of entities that have issues.
 *
 * Requires `req.resource.resource`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function fetchIssueEntitiesCount (req, res, next) {
  const { dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params
  const { resource: resourceId } = req.resource
  console.assert(resourceId, 'missng resource id')
  const issueEntitiesCount = await performanceDbApi.getEntitiesWithIssuesCount({ resource: resourceId, issueType, issueField }, datasetId)
  req.issueEntitiesCount = parseInt(issueEntitiesCount)
  next()
}

/**
 * Fetches issues from the performance database and updates the request object with the result.
 *
 * This middleware requires the `resourceId` to be present in the request params or request object.
 *
 * @param {object} req - The HTTP request object
 * @param {object} res - The HTTP response object
 * @param {function} next - The next middleware function in the stack
 *
 * @throws {Error} If `resourceId` is missing from the request
 */
export async function fetchIssues (req, res, next) {
  const { dataset, issue_type: issueType, issue_field: issueField, lpa } = req.params

  try {
    req.issues = await performanceDbApi.getIssues({ organisation: lpa, dataset, issueType, issueField })
    next()
  } catch (error) {
    next(error)
  }
}

/**
 *
 * Middleware. Updates `req` with `issues`.
 *
 * Requires `issues` in request.
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function reformatIssuesToBeByEntryNumber (req, res, next) {
  const { issues } = req
  const issuesByEntryNumber = issues.reduce((acc, current) => {
    acc[current.entry_number] = acc[current.entry_number] || []
    acc[current.entry_number].push(current)
    return acc
  }, {})
  req.issuesByEntryNumber = issuesByEntryNumber
  next()
}

export function formatErrorSummaryParams (req, res, next) {
  const { lpa, dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params
  const { issuesByEntryNumber, entityCount: entityCountRow, issueEntitiesCount } = req

  const { entity_count: entityCount } = entityCountRow ?? { entity_count: 0 }

  const BaseSubpath = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/entry/`

  let errorHeading
  let issueItems

  if (Object.keys(issuesByEntryNumber).length < entityCount) {
    errorHeading = performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issueEntitiesCount, entityCount, field: issueField }, true)
    issueItems = Object.keys(issuesByEntryNumber).map((entryNumber, i) => {
      return {
        html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: 1, field: issueField }) + ` in record ${entryNumber}`,
        href: `${BaseSubpath}${entryNumber}`
      }
    })
  } else {
    issueItems = [{
      html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issueEntitiesCount, entityCount, field: issueField }, true)
    }]
  }

  req.errorSummary = {
    heading: errorHeading,
    items: issueItems
  }
  next()
}

export const getEntryNumbersWithIssues = (req, res, next) => {
  const { issues } = req

  const entryNumbersWithIssues = [...new Set(issues.map(issue => issue.entry_number))]

  req.entryNumbersWithIssues = entryNumbersWithIssues

  next()
}

export const fetchEntitiesFromOrganisationAndEntryNumbers = fetchMany({
  query: ({ req, params }) => performanceDbApi.fetchEntitiesFromEntryNumbers({ entryNumbers: req.entryNumbersWithIssues, organisationEntity: req.orgInfo.entity, pagination: req.pagination }),
  result: 'entities',
  dataset: FetchOptions.fromParams
})

export const getPaginationOptions = (resultsCount) => (req, res, next) => {
  const { pageNumber } = req.params

  req.pagination = { offset: pageNumber * resultsCount, limit: resultsCount }

  next()
}

export const extractJsonFieldFromEntities = (req, res, next) => {
  const { entities } = req

  req.entities = entities.map(entity => {
    const jsonField = entity.json
    delete entity.json
    const parsedJson = JSON.parse(jsonField)
    entity = { ...entity, ...parsedJson }
    return entity
  })

  next()
}

export const replaceUnderscoreWithHyphenForEntities = (req, res, next) => {
  const { entities } = req

  entities.forEach(entity => {
    Object.keys(entity).forEach(key => {
      if (key.includes('_')) {
        const newKey = key.replace(/_/g, '-')
        entity[newKey] = entity[key]
        delete entity[key]
      }
    })
  })

  next()
}

export const nestEntityFields = (req, res, next) => {
  const { entities, specification } = req

  req.entities = entities.map(entity => {
    specification.fields.forEach(field => {
      entity[field.field] = { value: entity[field.field] }
    })
    return entity
  })

  next()
}

export const addIssuesToEntities = (req, res, next) => {
  const { entities, issues } = req

  req.entitiesWithIssues = entities.map(entity => {
    const entityIssues = issues.filter(issue => issue.entryNumber === entity.entryNumber)

    entityIssues.forEach(issue => {
      entity[issue.field].value = issue.value
      entity[issue.field].issue = issue
    })

    return entity
  })

  next()
}
