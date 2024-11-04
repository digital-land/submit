import { addDatabaseFieldToSpecification, createPaginationTemplateParams, extractJsonFieldFromEntities, fetchDatasetInfo, fetchLatestResource, fetchLpaDatasetIssues, fetchOrgInfo, getIsPageNumberInRange, isResourceAccessible, isResourceIdInParams, pullOutDatasetSpecification, replaceUnderscoreInEntities, replaceUnderscoreInSpecification, setDefaultParams, takeResourceIdFromParams, validateQueryParams } from './common.middleware.js'
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

export const fetchSpecification = fetchOne({
  query: ({ req }) => `select * from specification WHERE specification = '${req.dataset.collection}'`,
  result: 'specification'
})

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

export const fetchFieldMappings = fetchMany({
  query: () => 'select * from transform',
  result: 'fieldMappings'
})

export const setPaginationOptions = (pageLength) => (req, res, next) => {
  const { entityCount } = req
  const { lpa, dataset } = req.params

  req.resultsCount = entityCount.count
  req.urlSubPath = `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(dataset)}/data/`
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

export const prepareTemplateParams = (req, res, next) => {
  const { orgInfo, dataset, tableParams, issues, pagination } = req

  req.templateParams = {
    organisation: orgInfo,
    dataset,
    taskCount: (issues?.length) ?? 0,
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

  prepareTemplateParams,
  getGetDataview
]
