import logger from '../utils/logger.js'
import { createPaginationTemplateParams, fetchDatasetInfo, fetchLatestResource, fetchLpaDatasetIssues, fetchOrgInfo, getIsPageNumberInRange, isResourceAccessible, isResourceIdInParams, takeResourceIdFromParams, validateQueryParams } from './common.middleware.js'
import { fetchResourceStatus } from './datasetTaskList.middleware.js'
import { fetchIf, fetchMany, fetchOne, FetchOptions, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

const pageLength = 50

export const dataviewQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  pageNumber: v.optional(v.pipe(v.string(), v.transform(s => parseInt(s, 10)), v.minValue(1)), '1'),
  resourceId: v.optional(v.string())
})

const validatedataviewQueryParams = validateQueryParams({
  schema: dataviewQueryParams
})

export const setDefaultParams = (req, res, next) => {
  const { pageNumber } = req.parsedParams

  req.params.pageNumber ??= pageNumber

  next()
}

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
  req.specification = datasetSpecification
  next()
}

export const fetchEntitiesCount = fetchOne({
  query: ({ req }) => `SELECT count(*) as count FROM entity WHERE organisation_entity = ${req.orgInfo.entity}`,
  dataset: FetchOptions.fromParams,
  result: 'entityCount'
})

export const setTotalPages = (req, res, next) => {
  req.totalPages = req.entityCount.count / pageLength
  next()
}

export const fetchEntities = fetchMany({
  query: ({ req, params }) => `SELECT * FROM entity WHERE organisation_entity = ${req.orgInfo.entity} LIMIT ${pageLength} OFFSET ${pageLength * params.pageNumber}`,
  dataset: FetchOptions.fromParams,
  result: 'entities'
})

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
      entity = { ...entity, ...parsedJson }
    } catch (err) {
      logger.warn(`common.middleware/extractJsonField: Error parsing JSON for entity ${entity.toString()}: ${err.message}`)
    }
    return entity
  })

  next()
}

export const replaceUnderscoreInEntities = (req, res, next) => {
  req.entities = req.entities.map((entity) => {
    return Object.keys(entity).reduce((acc, key) => {
      const newKey = key.replace(/_/g, '-')
      acc[newKey] = entity[key]
      return acc
    }, {})
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

export const replaceUnderscoreInSpecification = (req, res, next) => {
  req.specification.fields = req.specification.fields.map((spec) => {
    if (spec.datasetField) {
      spec.datasetField = spec.datasetField.replace(/_/g, '-')
    }
    return spec
  })

  next()
}

export const setPaginationOptions = (pageLength) => (req, res, next) => {
  const { entityCount } = req
  const { lpa, dataset: datasetId } = req.params

  req.resultsCount = entityCount.count
  req.urlSubPath = `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(datasetId)}/data/`
  req.paginationPageLength = pageLength

  next()
}

export const constructTableParams = (req, res, next) => {
  const { entities, specification } = req

  const columns = specification.fields.map(field => field.field)
  const fields = specification.fields.map(field => field.datasetField)
  const rows = entities.map(entity => ({
    columns: Object.fromEntries(fields.map(field => {
      const value = {
        value: entity[field]
      }
      return [field, value]
    }))
  }))

  req.tableParams = {
    columns,
    fields,
    rows
  }

  next()
}

export const prepareTemplatePramas = (req, res, next) => {
  const { orgInfo, dataset, tableParams, issues, pagination } = req

  req.templateParams = {
    organisation: orgInfo,
    dataset,
    taskCount: issues.length ?? 0,
    tableParams,
    pagination
  }
  next()
}

export const getGetDataview = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/dataview.html',
  handlerName: 'getDataview'
})

export default [
  validatedataviewQueryParams,
  setDefaultParams,

  fetchOrgInfo,
  fetchDatasetInfo,
  fetchResourceStatus,
  fetchIf(isResourceIdInParams, fetchLatestResource, takeResourceIdFromParams),
  fetchIf(isResourceAccessible, fetchLpaDatasetIssues),

  fetchEntitiesCount,
  setTotalPages,
  getIsPageNumberInRange('totalPages'),

  fetchEntities,
  extractJsonFieldFromEntities,
  replaceUnderscoreInEntities,

  fetchSpecification,
  pullOutDatasetSpecification,
  replaceUnderscoreInSpecification,

  fetchFieldMappings,
  addDatabaseFieldToSpecification,

  constructTableParams,

  setPaginationOptions(pageLength),
  createPaginationTemplateParams,

  prepareTemplatePramas,
  getGetDataview
]
