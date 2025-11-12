// @ts-check
/**
 * @module middleware-common
 *
 */
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { getDataSubjects, entryIssueGroups } from '../utils/utils.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { datasetOverride, fetchMany, fetchOne, FetchOneFallbackPolicy, FetchOptions, onlyIf, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'
import { createPaginationTemplateParamsObject } from '../utils/pagination.js'
import datasette from '../services/datasette.js'
import { errorTemplateContext, MiddlewareError } from '../utils/errors.js'
import { dataRangeParams } from '../routes/schemas.js'

/**
 * Middleware. Set `req.handlerName` to a string that will identify
 * the function that threw the error.
 *
 * @param {Error} err - The error that was thrown
 * @param {Object} req - Express request object with handlerName property
 * @param {string} req.handlerName - Name of the handler function
 * @param {string} req.originalUrl - Original request URL
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
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
export const isResourceIdValid = (req) => req.resourceStatus.resource.trim() !== ''
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
    const err = new MiddlewareError('Query params validation error', 400, { cause: error })
    res.status(err.statusCode).render(err.template, { ...errorTemplateContext(), err })
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
  v.parse(dataRangeParams, dataRange)

  if (pageNumber > dataRange.maxPageNumber || pageNumber < 1) {
    const error = new MiddlewareError(`page number ${pageNumber} not in range [1, ${dataRange.maxPageNumber}]`, 404)
    return next(error)
  }
  next()
}

/**
 * Potentially Updates `req` with `pagination`
 *
 * @param {Object} req request
 * @param {Object} res response
 * @param {Function} next next function
 * @returns {undefined}
 */
export const createPaginationTemplateParams = (req, res, next) => {
  const { pageNumber } = req.parsedParams
  const { baseSubpath, dataRange } = req

  if (isNaN(pageNumber) || pageNumber < 1) {
    const error = new Error('Invalid page number')
    return next(error)
  }

  if (dataRange.maxPageNumber <= 1) {
    return next()
  }

  req.pagination = createPaginationTemplateParamsObject({ pageNumber, dataRange, baseSubpath })

  next()
}

// Resources

export const fetchResources = fetchMany({
  query: ({ req }) => {
    const lpaClause = req.params.lpa ? `AND ro.organisation = '${req.params.lpa}'` : ''
    const datasetClause = req.params.dataset ? `AND rd.dataset = '${req.params.dataset}'` : ''
    return `
      SELECT DISTINCT  s.documentation_url, r.start_date as resource_start_date, r.end_date, r.entry_date, r.mime_type, r.resource, r.start_date, rd.dataset, rhe.endpoint_url, rhe.licence, rhe.status, rhe.latest_log_entry_date, rhe.endpoint_entry_date from resource r
      LEFT JOIN resource_organisation ro ON ro.resource = r.resource
      LEFT JOIN resource_dataset rd ON rd.resource = r.resource
      LEFT JOIN reporting_historic_endpoints rhe ON r.resource = rhe.resource
      LEFT JOIN source s ON s.endpoint = rhe.endpoint_url
      WHERE (r.end_date = '' OR r.end_date IS NULL)
      AND rhe.endpoint_url != ''
      AND rhe.endpoint_url IS NOT NULL
      ${lpaClause}
      ${datasetClause}
      ORDER BY r.start_date desc`
  },
  result: 'resources'
})

export const addEntityCountsToResources = async (req, res, next) => {
  const { resources } = req

  const promises = resources.map(resource => {
    const query = `SELECT entry_count FROM dataset_resource WHERE resource = "${resource.resource}"`
    return datasette.runQuery(query, resource.dataset)
  })

  try {
    const datasetResources = await Promise.all(promises).catch(error => {
      logger.error('Failed to fetch dataset resources', { type: types.DataFetch, errorMessage: error.message, errorStack: error.stack })
      throw error
    })

    req.resources = resources.map((resource, i) => {
      return { ...resource, entry_count: datasetResources[i]?.formattedData[0]?.entry_count ?? 0 }
    })

    next()
  } catch (error) {
    logger.error('Error in addEntityCountsToResources', { type: types.App, errorMessage: error.message, errorStack: error.stack })
    next(error)
  }
}

// Specification

export const fetchSpecification = fetchOne({
  query: ({ req }) => `select * from specification WHERE specification = '${req.dataset.collection}'`,
  result: 'specification',
  // Set fall back here as some datasets may not have a specification yet, then handle different field name lookup in next middleware
  fallbackPolicy: FetchOneFallbackPolicy['set-empty-object']
})

// Fall back dataset fields if no specification found

export const fetchDatasetFields = fetchMany({
  query: ({ req }) => `select field from dataset_field where dataset = '${req.dataset.collection}'`,
  result: 'datasetFields'
})

export const pullOutDatasetSpecification = (req, res, next) => {
  const { specification } = req
  let collectionSpecifications
  if (!specification) {
    logger.info(`No specification found for dataset with collection: ('${req.dataset.collection}') (uses the collection as lookup key for spec table)`)
    return next()
  }

  try {
    collectionSpecifications = JSON.parse(specification.json)
  } catch (error) {
    logger.error('Invalid JSON in specification.json', { error })
    return next(new Error('Invalid specification format'))
  }
  const datasetSpecification = collectionSpecifications.find((spec) => spec.dataset === req.dataset.dataset)
  if (!datasetSpecification) {
    logger.error('Dataset specification not found', { dataset: req.dataset.dataset })
    return next(new MiddlewareError('Dataset specification not found', 404))
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

// If no specification exists, create a minimal specification table (data such as guidance will be missing) using dataset fields table as a fall back option
export const constructSpecificationTable = (req, res, next) => {
  const { datasetFields } = req
  // Filter out internal system fields that shouldn't be displayed
  const systemFields = ['entity', 'prefix', 'entry-number', 'organisation-entity']

  req.specification = {
    fields: datasetFields
      .filter(fieldObj => !systemFields.includes(fieldObj.field))
      .map(fieldObj => ({
        field: fieldObj.field,
        datasetField: fieldObj.field
      }))
  }
  return next()
}

/**
 * @name processSpecificationMiddleware
 * @function
 * @description Middleware chain to process the dataset specification and prepare it for the issue table, conditional execution on whether a specification exists
 */
export const processSpecificationMiddlewares = [
  fetchSpecification,
  pullOutDatasetSpecification,
  // When specification exists, use field mappings from transform table
  onlyIf(req => req.specification, replaceUnderscoreInSpecification),
  onlyIf(req => req.specification, fetchFieldMappings),
  onlyIf(req => req.specification, addDatabaseFieldToSpecification),
  // When no specification exists, use fields from dataset_field table
  onlyIf(req => !req.specification, fetchDatasetFields),
  onlyIf(req => !req.specification, constructSpecificationTable),
  getUniqueDatasetFieldsFromSpecification
]

// Entities

export const fetchEntities = async (req, res, next) => {
  try {
    let entities = []
    const limit = 1000

    // get count of entities for the organisation
    const {
      formattedData: [{ count }]
    } = await datasette.runQuery(
      `SELECT COUNT(*) as count FROM entity e WHERE e.organisation_entity = ${req.orgInfo.entity}`,
      datasetOverride(FetchOptions.fromParams, req)
    )

    // fetch entities in batches of `limit` until we have fetched all entities
    // datasette limits the number of rows returned to 1000 by default
    if (count && count > 0) {
      for (let offset = 0; offset < count; offset += limit) {
        const query = `SELECT * FROM entity e WHERE e.organisation_entity = ${req.orgInfo.entity} LIMIT ${limit} OFFSET ${offset}`
        const { formattedData } = await datasette.runQuery(query, datasetOverride(FetchOptions.fromParams, req))
        entities = entities.concat(formattedData)
      }
    } else {
      logger.info('fetchEntities(): No entities found', { type: types.App, endpoint: req.originalUrl })
    }

    req.entities = entities

    next()
  } catch (error) {
    logger.error('fetchEntities(): failed', { type: types.DataFetch, endpoint: req.originalUrl, errorMessage: error.message, errorStack: error.stack })

    next(error)
  }
}

export const fetchEntityCount = fetchOne({
  query: ({ req }) => `
    SELECT COUNT(*) as count FROM entity e
    WHERE e.organisation_entity = ${req.orgInfo.entity}`,
  dataset: FetchOptions.fromParams,
  result: 'entityCount'
})

export const extractJsonFieldFromEntities = (req, res, next) => {
  const { entities } = req
  if (!Array.isArray(entities)) {
    logger.error('Invalid entities array', { entities })
    return next(new Error('Invalid entities format'))
  }

  let numEntitiesWithNoJson = 0
  req.entities = entities.map(entity => {
    const jsonField = entity.json
    if (!jsonField || jsonField === '') {
      numEntitiesWithNoJson += 1
      return entity
    }
    entity.json = undefined
    try {
      const parsedJson = JSON.parse(jsonField)
      entity = Object.assign({}, parsedJson, entity)
    } catch (err) {
      logger.warn('common.middleware/extractJsonField: Error parsing JSON',
        { type: types.App, json: jsonField, entity: entity.entity, errorMessage: err.message })
    }
    return entity
  })

  if (numEntitiesWithNoJson > 0) {
    logger.info(`Got ${numEntitiesWithNoJson} entities with no json field`,
      { type: types.App, endpoint: req.originalUrl })
  }

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

  const entitiesWithIssues = new Set()
  for (const issue of issues) {
    entitiesWithIssues.add(issue.entity)
  }

  const result = []
  for (const entity of entities) {
    if (entitiesWithIssues.has(entity.entity)) {
      result.push(entity)
    }
  }

  req.issueEntities = result

  next()
}

// entity issues

const fetchEntityIssuesForFieldAndType = fetchMany({
  query: ({ req, params }) => {
    const issueTypeClause = params.issue_type ? `AND i.issue_type = '${params.issue_type}'` : ''
    const issueFieldClause = params.issue_field ? `AND field = '${params.issue_field}'` : ''

    return `
        WITH ranked AS (
          SELECT
            i.issue_type,
            field,
            entity,
            message,
            severity,
            value,
            ROW_NUMBER() OVER (
              PARTITION BY i.issue_type, entity
              ORDER BY i.rowid
            ) AS rn
          FROM issue i
          LEFT JOIN issue_type it ON i.issue_type = it.issue_type
          WHERE resource IN ('${req.resources.map(resource => resource.resource).join("', '")}')
            ${issueTypeClause}
            AND it.responsibility = 'external'
            AND it.severity = 'error'
            ${issueFieldClause}
            AND i.dataset = '${req.params.dataset}'
            AND entity != ''
            AND (
              i.end_date = ''
              OR i.end_date IS NULL
            )
        )
        SELECT
          issue_type,
          field,
          entity,
          message,
          severity,
          value
        FROM ranked
        WHERE rn = 1
        ORDER BY entity;
      `
    // LIMIT ${req.dataRange.pageLength} OFFSET ${req.dataRange.offset}
  },
  result: 'issues'
})

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

// some field mappings aren't in our database, so we should add them here
const customFieldMappings = [
  {
    field: 'GeoX,GeoY',
    replacement_field: 'point'
  }
]
export const addCustomFieldMappings = (req, res, next) => {
  const { fieldMappings } = req

  req.fieldMappings = [...fieldMappings, ...customFieldMappings]
  next()
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

// We can only get the issues without entity from the latest resource as we have no way of knowing if those in previous resources have been fixed?
export const fetchEntryIssues = fetchMany({
  query: ({ req, params }) => {
    const issueTypeClause = params.issue_type ? `AND i.issue_type = '${params.issue_type}'` : ''
    const issueFieldClause = params.issue_field ? `AND field = '${params.issue_field}'` : ''
    return `
      select i.issue_type, field, entity, message, severity, value, line_number
      from issue i
      LEFT JOIN issue_type it ON i.issue_type = it.issue_type
      WHERE resource = '${req.resources[0].resource}'
      ${issueTypeClause}
      AND it.responsibility = 'external'
      AND it.severity = 'error'
      AND i.dataset = '${req.params.dataset}'
      ${issueFieldClause}
      AND (entity = '' OR entity is NULL OR i.issue_type in ('${entryIssueGroups.map(issue => issue.type).join("', '")}'))
      LIMIT ${req.dataRange.pageLength} OFFSET ${req.dataRange.offset}
    `
  },
  result: 'entryIssues'
})

export const fetchEntityIssueCounts = fetchMany({
  query: ({ req }) => {
    const datasetClause = req.params.dataset ? `AND i.dataset = '${req.params.dataset}'` : ''
    const sqlQuery = `
      WITH unique_issues AS (
        SELECT DISTINCT
          i.dataset,
          i.field,
          i.issue_type,
          i.entity
        FROM issue i
        LEFT JOIN issue_type it ON i.issue_type = it.issue_type
        WHERE resource IN ('${req.resources.map(resource => resource.resource).join("', '")}')
          AND COALESCE(entity, '') <> ''
          AND (i.end_date = '' OR i.end_date IS NULL)
          AND it.responsibility = 'external'
          AND it.severity = 'error'
          ${datasetClause}
      )
      SELECT
        dataset,
        field,
        issue_type,
        COUNT(*) AS count
      FROM unique_issues
      GROUP BY field, issue_type, dataset
    `
    console.log('sqlQuery', sqlQuery)
    return sqlQuery
  },
  result: 'entityIssueCounts'
})

export const getMostRecentResources = (resources) => {
  const mostRecentResourcesMap = {}
  resources.forEach(resource => {
    const currentRecent = mostRecentResourcesMap[resource.dataset]
    if (!currentRecent || new Date(currentRecent.start_date).getTime() < new Date(resource.start_date).getTime()) {
      mostRecentResourcesMap[resource.dataset] = resource
    }
  })
  return Object.values(mostRecentResourcesMap)
}

export const fetchEntryIssueCounts = fetchMany({
  query: ({ req }) => {
    const datasetClause = req.params.dataset ? `AND i.dataset = '${req.params.dataset}'` : ''

    const mostRecentResources = getMostRecentResources(req.resources)

    const resourceIds = Object.values(mostRecentResources).map(resource => resource.resource)

    return `
      select dataset, field, i.issue_type, COUNT(resource + line_number) as count
      from issue i
      LEFT JOIN issue_type it ON i.issue_type = it.issue_type
      WHERE resource in ('${resourceIds.join("', '")}')
      AND (entity = '' OR entity is NULL)
      AND it.responsibility = 'external'
      AND it.severity = 'error'
      ${datasetClause}
      GROUP BY field, i.issue_type, dataset
    `
  },
  result: 'entryIssueCounts'
})

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
  // arguably removeIssuesThatHaveBeenFixed should be s step however we have only currently found one organisation,
  // however this step is very time consuming, so in order to progress im commenting it out for now
  // removeIssuesThatHaveBeenFixed,
  fetchFieldMappings,
  addCustomFieldMappings,
  addFieldMappingsToIssue
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

/**
 * @param {number} pageLength
 * @returns {Function} Express middleware function
 */
export const getSetDataRange = (pageLength) => {
  v.parse(v.pipe(v.number(), v.integer(), v.minValue(1)), pageLength)

  return (req, res, next) => {
    const { pageNumber } = req.parsedParams

    let recordCount = req.recordCount
    if (typeof recordCount !== 'number' || recordCount < 0) {
      logger.warn(`Invalid record count: ${recordCount}`, { type: types.App, recordCount, endpoint: req.originalUrl })
      recordCount = 0
    }

    req.dataRange = v.parse(dataRangeParams, {
      minRow: (pageNumber - 1) * pageLength,
      maxRow: Math.min((pageNumber - 1) * pageLength + pageLength, recordCount),
      totalRows: recordCount,
      // pageNumber starts with 1, so we maxPageNumber to start with 1
      maxPageNumber: Math.max(Math.ceil(recordCount / pageLength), 1),
      pageLength,
      offset: (pageNumber - 1) * pageLength
    })

    next()
  }
}

export function getErrorSummaryItems (req, res, next) {
  const { issue_type: issueType, issue_field: issueField, dataset } = req.params
  const { entryIssues, issues: entityIssues, issueCount, entities, resources } = req

  const issues = entityIssues || entryIssues

  const totalRecordCount = entities ? entities.length : resources[0].entry_count
  const totalIssues = issueCount?.count || issues.length

  const errorHeading = ''
  const issueItems = [{
    html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: totalIssues, rowCount: totalRecordCount, field: issueField, dataset }, true)
  }]

  req.errorSummary = {
    heading: errorHeading,
    items: issueItems
  }

  next()
}

export function getIssueSpecification (req, res, next) {
  const { issue_field: issueField } = req.params
  const { specification } = req

  if (specification) {
    const fieldSpecification = specification.fields.find(f => f.field === issueField)
    req.issueSpecification = fieldSpecification
  }

  next()
}

export const prepareIssueDetailsTemplateParams = (req, res, next) => {
  const { entry, pagination, dataRange, errorSummary, dataset, orgInfo, issueSpecification } = req
  const { issue_type: issueType, issue_field: issueField, pageNumber } = req.parsedParams

  // schema: OrgIssueDetails
  req.templateParams = {
    organisation: orgInfo,
    dataset,
    errorSummary,
    entry,
    issueType,
    issueField,
    pagination,
    pageNumber,
    dataRange,
    issueSpecification
  }

  next()
}

export const fetchEndpointSummary = fetchMany({
  query: ({ params }) => {
    const datasetClause = params.dataset ? `AND dataset = '${params.dataset}'` : ''

    return `
      SELECT * FROM endpoint_dataset_summary
      WHERE organisation = '${params.lpa}'
      AND end_date = ''
      ${datasetClause}
    `
  },
  result: 'endpoints',
  dataset: FetchOptions.performanceDb
})
export const validateOrgAndDatasetQueryParams = validateQueryParams({
  schema: v.object({
    lpa: v.string(),
    dataset: v.string()
  })
})

export const fetchSources = fetchMany({
  query: ({ params }) => `
    WITH RankedEndpoints AS (
      SELECT
        rhe.endpoint,
        rhe.endpoint_url,
        case
            when rhe.status = '' or rhe.status is null then null
            else cast(rhe.status as int)
        end as status,
        rhe.exception,
        rhe.resource,
        rhe.latest_log_entry_date,
        rhe.endpoint_entry_date,
        rhe.endpoint_end_date,
        rhe.resource_start_date as resource_start_date,
        rhe.resource_end_date,
        s.documentation_url,
        ROW_NUMBER() OVER (
          PARTITION BY rhe.endpoint_url
          ORDER BY
            rhe.latest_log_entry_date DESC
        ) AS row_num
      FROM
        reporting_historic_endpoints rhe
        LEFT JOIN source s ON rhe.endpoint = s.endpoint
      WHERE
        REPLACE(rhe.organisation, '-eng', '') = '${params.lpa}'
        AND rhe.pipeline = '${params.dataset}'
        AND (
          rhe.resource_end_date >= current_timestamp
          OR rhe.resource_end_date IS NULL
          OR rhe.resource_end_date = ''
        )
        AND (
          rhe.endpoint_end_date >= current_timestamp
          OR rhe.endpoint_end_date IS NULL
          OR rhe.endpoint_end_date = ''
        )
    )
    SELECT
      endpoint,
      endpoint_url,
      status,
      exception,
      resource,
      latest_log_entry_date,
      endpoint_entry_date,
      endpoint_end_date,
      resource_start_date,
      resource_end_date,
      documentation_url
    FROM
      RankedEndpoints
    WHERE
      row_num = 1
    ORDER BY
      latest_log_entry_date DESC;
  `,
  result: 'sources'
})

export const noIndexHeader = (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex')
  next()
}

/**
 * Middleware. Prevents indexing of certain pages
 *
 * @param req
 * @param res
 * @param next
 */
export const preventIndexing = (req, res, next) => {
  if (/^\/organisations\/[\w-:]+\/.*$|^\/check\/status.*$|\/check\/results.*$/.test(req.originalUrl)) {
    return noIndexHeader(req, res, next)
  }
  next()
}

/**
 * Middleware.
 * @param {*} req request object
 * @param {*} res response object
 * @param {*} next next function
 */
export function noop (req, res, next) {
  next()
}

const expectationsOutOfBoundsDetailsSelectClause = () => {
  return `CAST(JSON_EXTRACT(details, '$.actual') AS INTEGER) AS actual,
          CAST(JSON_EXTRACT(details, '$.expected') AS INTEGER) AS expected,
          details as details`
}

const expectationsQuery = ({ lpa, dataset, expectation, includeDetails }) => {
  let datasetClause = ''
  if (dataset) {
    datasetClause = ` AND dataset = '${dataset}'`
  }

  return /* sql */ `
  select dataset, name, passed, severity ${includeDetails ? ', ' + expectationsOutOfBoundsDetailsSelectClause() : ''}
  from expectation
  where
     passed = 'False'
     AND name = '${expectation.name}'
     AND organisation = '${lpa}'
     ${datasetClause}`
}
/**
 * The `name` field is used in queries.
 */
export const expectations = {
  entitiesOutOfBounds: { name: 'Check no entities are outside of the local planning authority boundary', slug: 'out-of-bounds' }
}

/**
 *
 * @param {Object} options
 * @param {string} options.result key under which results will be stored in req
 * @param {Object} options.expectation one of defined {@link expectations}
 * @param {boolean} [options.includeDetails=false] should results include details (a JSON blob)
 * @returns {Function} middleware function
 */
export const expectationFetcher = ({ expectation, result, includeDetails = false }) => {
  return fetchMany({
    query: ({ params }) => expectationsQuery({ lpa: params.lpa, dataset: params.dataset, expectation, includeDetails }),
    result
  })
}

export const CONSTANTS = {
  async availableDatasets () {
    const dataSubjects = await getDataSubjects()
    return Object.values(dataSubjects).flatMap((dataSubject) => dataSubject.dataSets
      .filter((dataset) => dataset.available)
      .map((dataset) => dataset.value)
    )
  }
}
/**
 * Provides the list of available/supported datasets.
 * @param {Object} req requets object
 * @param {string[]} [req.availableDatasets] OUT list of available datasets
 * @param {*} res
 * @param {*} next
 */
export const setAvailableDatasets = async (req, res, next) => {
  // Motivation: stop relying on global variables all over the place
  req.availableDatasets = await CONSTANTS.availableDatasets()
  next()
}
