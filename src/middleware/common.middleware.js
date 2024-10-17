import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { fetchOne, FetchOptions, FetchOneFallbackPolicy, fetchMany } from './middleware.builders.js'
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
export const isResourceNotAccessible = (req) => !isResourceAccessible(req)
export const isResourceIdNotInParams = ({ params }) => !('resourceId' in params)

/**
 * Middleware. Updates req with `resource`.
 */
export const fetchLatestResource = fetchOne({
  query: ({ params }) => performanceDbApi.latestResourceQuery(params.lpa, params.dataset),
  result: 'resource'
})

export const fetchActiveResourcesForOrganisationAndDataset = fetchMany({
  query: ({ params }) => performanceDbApi.activeResourcesForOrganisationAndDatasetQuery(params.lpa, params.dataset),
  result: 'resources'
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
export function validateQueryParamsFn (req, res, next) {
  try {
    v.parse(this.schema || v.any(), req.params)
    next()
  } catch (error) {
    res.status(400).render('errorPages/400', {})
  }
}

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

export function formatErrorSummaryParams (req, res, next) {
  const { lpa, dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params
  const { entityCount: entityCountRow, issuesWithReferences, issuesWithoutReferences, entities } = req

  const { entity_count: entityCount } = entityCountRow ?? { entity_count: 0 }

  const BaseSubpath = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/entry/`

  let errorHeading
  let issueItems

  // if the entities length is 0, this means the entry never became an entity, so we shouldn't show the table or links to the entity details page
  if (entities.length === 0) {
    issueItems = [{
      html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issuesWithoutReferences.length, entityCount, field: issueField }, true)
    }]
  } else if (entities.length < entityCount) {
    errorHeading = performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: entities.length, entityCount, field: issueField }, true)
    issueItems = entities.map((entity, index) => {
      return {
        html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: 1, field: issueField }) + ` in entity ${entity?.reference?.value || entity?.reference}`,
        href: `${BaseSubpath}${index + 1}`
      }
    })
  } else {
    issueItems = [{
      html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issuesWithReferences.length, entityCount, field: issueField }, true)
    }]
  }

  req.errorSummary = {
    heading: errorHeading,
    items: issueItems
  }
  next()
}

// as we want the number of entities with issues anyway, we do the pagination here instead of after. need this count in the performance db ideally
export const paginateEntitiesAndPullOutCount = (req, res, next) => {
  const { entities, pagination } = req
  const { pageNumber } = req.params

  const paginationIndex = pageNumber - 1

  req.entitiesWithIssuesCount = entities.length

  req.entities = entities.slice(pagination.offset * paginationIndex, pagination.offset * paginationIndex + pagination.limit)

  next()
}

export const getPaginationOptions = (resultsCount) => (req, res, next) => {
  const { pageNumber } = req.params

  req.pagination = { offset: (pageNumber - 1) * resultsCount, limit: resultsCount }

  next()
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
  let { pageNumber } = req.params
  pageNumber = parseInt(pageNumber)

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

export const extractJsonFieldFromEntities = (req, res, next) => {
  const { entities } = req

  req.entities = entities.map(entity => {
    const jsonField = entity.json
    if (!jsonField || jsonField === '') {
      logger.info(`common.middleware/extractJsonField: No json field for entity ${entity.toString()}`)
      return entity
    }
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
    const columnHeaders = [...new Set(specification.fields.map(field => field.datasetField || field.field))]
    columnHeaders.forEach(field => {
      entity[field] = { value: entity[field] }
    })
    return entity
  })

  next()
}

export const addDatasetFieldsToIssues = (req, res, next) => {
  const { issuesWithReferences, specification } = req

  req.issuesWithReferences = issuesWithReferences.map(issue => {
    let datasetField
    if (issue.field === 'GeoX,GeoY') { // special case for brownfield land
      datasetField = 'point'
    } else {
      const specificationEntry = specification.fields.find(field => field.field === issue.field)
      datasetField = specificationEntry ? specificationEntry.datasetField : specificationEntry?.field || issue.field
    }
    return { ...issue, datasetField }
  })

  next()
}

export const addIssuesToEntities = (req, res, next) => {
  const { entities, issuesWithReferences } = req

  req.entitiesWithIssues = entities.map(entity => {
    const entityIssues = issuesWithReferences.filter(issue => issue.entryNumber === entity.entryNumber)

    entityIssues.forEach(issue => {
      entity[issue.datasetField].value = issue.value || entity[issue.datasetField].value || ''
      entity[issue.datasetField].issue = issue
    })

    return entity
  })

  next()
}

export const hasEntities = (req, res, next) => req.entities !== undefined

export const fetchEntitiesFromIssuesWithReferences = fetchMany({
  query: ({ req }) => performanceDbApi.fetchEntitiesFromReferencesAndOrganisationEntity({
    references: req.issuesWithReferences.map(issueWithReference => issueWithReference.reference),
    organisationEntity: req.orgInfo.entity
  }),
  result: 'entities',
  dataset: FetchOptions.fromParams
})

export const fetchIssuesWithCounts = fetchMany({
  query: ({ req, params }) => performanceDbApi.issuesWithCountsQuery({
    resources: req.resources.map(resourceObj => resourceObj.resource),
    dataset: params.dataset,
    issueType: params.issue_type,
    issueField: params.issue_field,
    statusList: ['Error', 'Needs fixing', 'Warning']
  }),
  result: 'issuesWithCounts'
})

export const fetchIssuesWithReferencesFromResourcesDatasetIssuetypefield = fetchMany({
  query: ({ req, params }) => performanceDbApi.issuesWithReferenceFromResourcesDatasetIssueTypeFieldQuery({
    resources: req.resources.map(resourceObj => resourceObj.resource),
    dataset: params.dataset,
    issueType: params.issue_type,
    issueField: params.issue_field
  }),
  result: 'issuesWithReferences',
  dataset: FetchOptions.fromParams
})

export const fetchIssuesWithoutReferences = fetchMany({
  query: ({ req, params }) => performanceDbApi.fetchIssuesWithoutReferences({
    resources: req.resources.map(resourceObj => resourceObj.resource),
    dataset: params.dataset,
    issueType: params.issue_type,
    issueField: params.issue_field
  }),
  result: 'issuesWithoutReferences',
  dataset: FetchOptions.fromParams
})

export function validateQueryParams (context) {
  return validateQueryParamsFn.bind(context)
}

export const fetchFieldMappings = fetchMany({
  query: () => 'select * from transform',
  result: 'fieldMappings'
})

export const addDatabaseFieldToSpecification = (req, res, next) => {
  const { specification, fieldMappings } = req

  req.specification.fields = specification.fields.map(fieldObj => {
    if (['GeoX', 'GeoY'].includes(fieldObj.field)) { // special case for brownfield land
      return { datasetField: 'point', ...fieldObj }
    }

    const fieldMapping = fieldMappings.find(mapping => mapping.field === fieldObj.field)
    const databaseField = fieldMapping?.replacement_field || fieldObj.field
    return { datasetField: databaseField, ...fieldObj }
  })

  next()
}
