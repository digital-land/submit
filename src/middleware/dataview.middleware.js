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
  req.totalPages = Math.ceil(req.entityCount.count / pageLength)
  next()
}

export const setOffset = (req, res, next) => {
  const pageNumber = Number(req.params.pageNumber)

  if (isNaN(pageNumber)) {
    return next(new Error('Invalid page number'))
  }

  req.offset = (pageNumber - 1) * pageLength
  next()
}

export const fetchEntities = fetchMany({
  query: ({ req, params }) => `SELECT * FROM entity WHERE organisation_entity = ${req.orgInfo.entity} LIMIT ${pageLength} OFFSET ${req.offset}`,
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

export const getUniqueDatasetFieldsFromSpecification = (req, res, next) => {
  const { specification } = req

  if (!specification) {
    throw new Error('specification is required')
  }

  req.uniqueDatasetFields = [...new Set(specification.fields.map(field => field.datasetField))]

  next()
}

export const constructTableParams = (req, res, next) => {
  const { entities, uniqueDatasetFields } = req

  const columns = uniqueDatasetFields
  const fields = uniqueDatasetFields
  const rows = entities.map(entity => ({
    columns: Object.fromEntries(fields.map(field => {
      let value
      let classes = ''
      let html

      // if the value is a number or a date string
      if (/^\d{4}-\d{2}-\d{2}$/.test(entity[field]) || /^\d+(\.\d+)?$/.test(entity[field])) {
        classes = 'govuk-table__cell--numeric'
        value = entity[field]
      }

      const urlRegex = /^https?:\/\/[^\s]+$/

      if (typeof entity[field] === 'string') {
        const text = entity[field]
        if (urlRegex.test(text)) {
          html = `<a href='${text}' target='_blank' rel='noopener noreferrer' aria-label='${text} (opens in new tab)'>${text}</a>`
        } else {
          value = text
        }
      }

      const valueObj = {
        value,
        classes,
        html
      }
      return [field, valueObj]
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
  const { orgInfo, dataset, tableParams, issues, pagination, entityCount, offset } = req

  req.templateParams = {
    organisation: orgInfo,
    dataset,
    taskCount: (issues?.length) ?? 0,
    tableParams,
    pagination,
    dataRange: {
      minRow: offset + 1,
      maxRow: Math.min(offset + pageLength, entityCount.count),
      totalRows: entityCount.count
    }
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

  setOffset,

  fetchEntities,
  extractJsonFieldFromEntities,
  replaceUnderscoreInEntities,

  fetchSpecification,
  pullOutDatasetSpecification,
  replaceUnderscoreInSpecification,

  fetchFieldMappings,
  addDatabaseFieldToSpecification,
  getUniqueDatasetFieldsFromSpecification,

  constructTableParams,

  setPaginationOptions(pageLength),
  createPaginationTemplateParams,

  prepareTemplateParams,
  getGetDataview
]
