import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { fetchOne, FetchOptions, FetchOneFallbackPolicy, fetchMany, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'
import { pagination } from '../utils/pagination.js'
import datasette from '../services/datasette.js'

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

export const show404IfPageNumberNotInRange = (req, res, next) => {
  const { dataRange } = req
  const { pageNumber } = req.parsedParams

  if (!dataRange || !dataRange.maxPageNumber || isNaN(dataRange.maxPageNumber)) {
    const error = new Error('invalid req.dataRange object')
    return next(error)
  }

  if (pageNumber > dataRange.maxPageNumber || pageNumber < 1) {
    const error = new Error('page number not in range')
    error.status = 404
    return next(error)
  }
  next()
}

export const createPaginationTemplateParams = (req, res, next) => {
  const { pageNumber } = req.parsedParams
  const { baseSubpath, dataRange } = req

  if (dataRange.maxPageNumber <= 1) {
    return next()
  }

  if (isNaN(pageNumber) || pageNumber < 1) {
    const error = new Error('Invalid page number')
    return next(error)
  }

  const paginationObj = {
    previous: undefined,
    next: undefined,
    items: undefined
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
  paginationObj.items = pagination(dataRange.maxPageNumber, Math.min(pageNumber, dataRange.maxPageNumber)).map(item => {
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
        href: `${baseSubpath}/${item}`,
        current: pageNumber === parseInt(item)
      }
    }
  })

  req.pagination = paginationObj

  next()
}

// Resources

export const fetchResources = fetchMany({
  query: ({ req }) => `
    SELECT r.end_date, r.entry_date, r.mime_type, r.resource, r.start_date, rle.endpoint_url, rle.licence, rle.status, rle.latest_log_entry_date, rle.endpoint_entry_date from resource r
    LEFT JOIN resource_organisation ro ON ro.resource = r.resource
    LEFT JOIN resource_dataset rd ON rd.resource = r.resource
    LEFT JOIN reporting_latest_endpoints rle ON r.resource = rle.resource
    WHERE ro.organisation = '${req.params.lpa}'
    AND rd.dataset = '${req.params.dataset}'
    AND r.end_date = ''
    ORDER BY start_date desc`,
  result: 'resources'
})

// Specification

export const fetchSpecification = fetchOne({
  query: ({ req }) => `select * from specification WHERE specification = '${req.dataset.collection}'`,
  result: 'specification'
})

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

export const replaceUnderscoreInSpecification = (req, res, next) => {
  req.specification.fields = req.specification.fields.map((spec) => {
    if (spec.datasetField) {
      spec.datasetField = spec.datasetField.replace(/_/g, '-')
    }
    return spec
  })

  next()
}

export const fetchFieldMappings = fetchMany({
  query: () => 'select * from transform',
  result: 'fieldMappings'
})

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

export const getUniqueDatasetFieldsFromSpecification = (req, res, next) => {
  const { specification } = req

  if (!specification) {
    throw new Error('specification is required')
  }

  req.uniqueDatasetFields = [...new Set(specification.fields.map(field => field.datasetField))]

  next()
}

/**
 * @name processSpecificationMiddleware
 * @function
 * @description Middleware chain to process the dataset specification and prepare it for the issue table
 */
export const processSpecificationMiddlewares = [
  fetchSpecification,
  pullOutDatasetSpecification,
  replaceUnderscoreInSpecification,
  fetchFieldMappings,
  addDatabaseFieldToSpecification,
  getUniqueDatasetFieldsFromSpecification
]

// Entities

export const fetchEntities = fetchMany({
  query: ({ req }) => `
    SELECT * FROM entity e
    WHERE e.organisation_entity = ${req.orgInfo.entity}`,
  dataset: FetchOptions.fromParams,
  result: 'entities'
})

export const extractJsonFieldFromEntities = (req, res, next) => {
  const { entities } = req
  if (!Array.isArray(entities)) {
    logger.error('Invalid entities array', { entities })
    return next(new Error('Invalid entities format'))
  }

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

/**
 * @name processEntitiesMiddleware
 * @function
 * @description Middleware chain to process entities and prepare them for the issue table
 */
export const processEntitiesMiddlewares = [
  fetchEntities,
  extractJsonFieldFromEntities,
  replaceUnderscoreInEntities
]

export const filterOutEntitiesWithoutIssues = (req, res, next) => {
  const { entities, issues } = req

  req.issueEntities = entities.filter(entity => {
    return issues.findIndex(issue => issue.entity === entity.entity) >= 0
  })

  next()
}

// entity issues

const fetchEntityIssuesForFieldAndType = fetchMany({
  query: ({ req, params }) => {
    const issueTypeFilter = params.issue_type ? `AND issue_type = '${params.issue_type}'` : ''
    const issueFieldFilter = params.issue_field ? `AND field = '${params.issue_field}'` : ''

    return `
      SELECT e.entity, i.* FROM entity e
      INNER JOIN issue i ON e.entity = i.entity
      WHERE e.organisation_entity = ${req.orgInfo.entity}
      ${issueTypeFilter}
      ${issueFieldFilter}`
  },
  dataset: FetchOptions.fromParams,
  result: 'issues'
})

export const FilterOutIssuesToMostRecent = (req, res, next) => {
  const { resources, issues } = req

  const issuesWithResources = issues.filter(issue => {
    if (!issue.resource || !resources.find(resource => resource.resource === issue.resource)) {
      logger.warn(`Missing resource on issue: ${JSON.stringify(issue)}`)
      return false
    }
    return true
  })

  const groupedIssues = issuesWithResources.reduce((acc, current) => {
    current.start_date = new Date(resources.find(resource => resource.resource === current.resource)?.start_date)
    const { entity, field } = current
    if (!acc[entity]) {
      acc[entity] = {}
    }
    if (!acc[entity][field]) {
      acc[entity][field] = []
    }
    acc[entity][field].push(current)

    return acc
  }, {})

  const recentIssues = Object.fromEntries(Object.entries(groupedIssues).map(([entityName, issuesByEntity]) =>
    [
      entityName,
      Object.fromEntries(Object.entries(issuesByEntity).map(([field, issues]) => [
        field,
        issues.sort((a, b) => b.start_date.getTime() - a.start_date.getTime())[0]
      ]))
    ]
  ))

  const issuesFlattened = []

  Object.values(recentIssues).forEach(issueByEntry => {
    Object.values(issueByEntry).forEach(issueByField => {
      issuesFlattened.push(issueByField)
    })
  })

  req.issues = issuesFlattened
  next()
}

export const fetchIssueTypes = fetchMany({
  query: () => 'SELECT * FROM issue_type',
  result: 'issueTypes'
})

export const addIssueSeverityToIssues = (req, res, next) => {
  const { issues, issueTypes } = req

  req.issues = issues.map(issue => {
    const issueTypeData = issueTypes.find(issueType => issueType.issue_type === issue.issue_type)
    return { ...issue, severity: issueTypeData.severity }
  })

  next()
}

const filterOutNonErrorSeverityIssues = (req, res, next) => {
  const { issues } = req

  req.issues = issues.filter(issue => issue.severity === 'error')

  next()
}

export const removeIssuesThatHaveBeenFixed = async (req, res, next) => {
  const { issues, resources } = req

  if (!resources || resources.length <= 0) {
    logger.warn('no resources provided for removeIssueThatHaveBeenFixed')
    return next()
  }

  // get all more recent facts for each issue
  const promises = issues
    .filter(issue => issue.resource !== resources[0].resource)
    .map((issue) => {
      const resourceIndex = resources.findIndex(resource => resource.resource === issue.resource)
      const newerResources = resourceIndex >= 0 ? resources.slice(0, resourceIndex) : resources

      return datasette.runQuery(`
        SELECT * FROM fact f
        LEFT JOIN fact_resource fr ON f.fact = fr.fact
        WHERE entity = ${issue.entity}
        AND field = '${issue.field}'
        AND fr.resource IN ('${newerResources.map(resource => resource.resource).join("','")}')
        ORDER BY fr.start_date desc
        LIMIT 1`,
      issue.dataset
      )
    })

  Promise.allSettled(promises).then((results) => {
  // results is an array of objects with status (fulfilled or rejected) and value or reason
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.formattedData.length > 0) {
          req.issues = req.issues.filter(issue => (issue.entity !== result.value.formattedData[0].entity || issue.field !== result.value.formattedData[0].field))
        }
      } else {
        logger.warn('request to datasette failed', {
          error: result.reason,
          stack: result.reason.stack
        })
      }
    })

    return next()
  }).catch(error => {
    logger.warn('Error in middleware, could not process promise array', {
      error
    })
    return next(error)
  })
}

export const addFieldMappingsToIssue = (req, res, next) => {
  const { issues, fieldMappings } = req

  if (!issues) {
    logger.warn('no issues provided to addFieldMappingsToIssues')
    return next()
  }

  if (!fieldMappings) {
    logger.warn('no fieldMappings provided to addFieldMappingsToIssues')
    return next()
  }

  req.issues = issues.map(issue => {
    return {
      ...issue,
      replacement_field: fieldMappings.find(mapping => mapping.field === issue.field)?.replacement_field
    }
  })

  next()
}

export const addReferencesToIssues = (req, res, next) => {
  const { issues, entities } = req

  req.issues = issues.map(issue => {
    const reference = entities.find(entity => entity.entity === issue.entity)?.reference

    return { ...issue, reference }
  })

  next()
}

/**
 * This middleware chain is responsible for retrieving all entities for the given organisation, their latest issues,
 * filtering out issues that have been fixed, and constructing the table params.
 *
 * @required {object} orgInfo - The orgInfo obtained by fetchOrgInfo middleware
 * @required {string} resources - Array of resources, obtained by fetchResources middleware
 *
 * @memberof IssueTableMiddleware
 * @name getRelevantIssues
 * @function
 * @returns {array} An array of middleware functions that construct the necessary data for all the relevant issues.
 */
export const processRelevantIssuesMiddlewares = [
  fetchEntityIssuesForFieldAndType,
  FilterOutIssuesToMostRecent,
  fetchIssueTypes,
  addIssueSeverityToIssues,
  filterOutNonErrorSeverityIssues,
  removeIssuesThatHaveBeenFixed,
  fetchFieldMappings,
  addFieldMappingsToIssue,
  addReferencesToIssues
]

// Other

export const setDefaultParams = (req, res, next) => {
  if (!req.parsedParams) {
    return next()
  }

  Object.keys(req.parsedParams).forEach((key) => {
    req.params[key] = req.parsedParams[key]
  })

  next()
}

export const getSetBaseSubPath = (additionalParts = []) => (req, res, next) => {
  const params = [
    req.params.lpa,
    req.params.dataset,
    req.params.issue_type,
    req.params.issue_field,
    ...additionalParts.map(encodeURIComponent)
  ]

  req.baseSubpath = params.reduce(
    (path, param) => (param ? `${path}/${param}` : path),
    '/organisations'
  )
  next()
}

export const getSetDataRange = (pageLength) => (req, res, next) => {
  const { recordCount } = req
  const { pageNumber } = req.parsedParams

  if (typeof recordCount !== 'number' || recordCount < 0) {
    return next(new Error('Invalid record count'))
  }
  if (typeof pageNumber !== 'number' || pageNumber < 1) {
    return next(new Error('Invalid page number'))
  }
  if (typeof pageLength !== 'number' || pageLength < 1) {
    return next(new Error('Invalid page length'))
  }

  req.dataRange = {
    minRow: (pageNumber - 1) * pageLength,
    maxRow: Math.min((pageNumber - 1) * pageLength + pageLength, recordCount),
    totalRows: recordCount,
    maxPageNumber: Math.ceil(recordCount / pageLength),
    pageLength,
    offset: (pageNumber - 1) * pageLength
  }
  next()
}

export function getErrorSummaryItems (req, res, next) {
  const { issue_type: issueType, issue_field: issueField } = req.params
  const { issues, issueCount, entities, resources } = req

  const totalRecordCount = entities ? entities.length : resources[0].entry_count
  const totalIssues = issueCount?.count || issues.length

  const errorHeading = ''
  const issueItems = [{
    html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: totalIssues, rowCount: totalRecordCount, field: issueField }, true)
  }]

  req.errorSummary = {
    heading: errorHeading,
    items: issueItems
  }

  next()
}

export const prepareIssueDetailsTemplateParams = (req, res, next) => {
  const { entry, pagination, dataRange, errorSummary, dataset, orgInfo } = req
  const { issue_type: issueType, pageNumber } = req.parsedParams

  // schema: OrgIssueDetails
  req.templateParams = {
    organisation: orgInfo,
    dataset,
    errorSummary,
    entry,
    issueType,
    pagination,
    pageNumber,
    dataRange
  }

  next()
}
