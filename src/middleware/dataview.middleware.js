import { createPaginationTemplateParams, extractJsonFieldFromEntities, fetchDatasetInfo, fetchLatestResource, fetchLpaDatasetIssues, fetchOrgInfo, isResourceAccessible, isResourceIdInParams, processSpecificationMiddlewares, replaceUnderscoreInEntities, setDefaultParams, takeResourceIdFromParams, validateQueryParams, show404IfPageNumberNotInRange } from './common.middleware.js'
import { fetchResourceStatus } from './datasetTaskList.middleware.js'
import { fetchIf, fetchMany, fetchOne, FetchOptions, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

export const dataviewQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  pageNumber: v.optional(v.pipe(v.string(), v.transform(s => parseInt(s, 10)), v.minValue(1)), '1'),
  resourceId: v.optional(v.string())
})

const validatedataviewQueryParams = validateQueryParams({
  schema: dataviewQueryParams
})

export const fetchEntitiesCount = fetchOne({
  query: ({ req }) => `SELECT count(*) as count FROM entity WHERE organisation_entity = ${req.orgInfo.entity}`,
  dataset: FetchOptions.fromParams,
  result: 'entityCount'
})

export const fetchEntities = fetchMany({
  query: ({ req, params }) => `SELECT * FROM entity WHERE organisation_entity = ${req.orgInfo.entity} LIMIT ${req.dataRange.pageLength} OFFSET ${req.dataRange.offset}`,
  dataset: FetchOptions.fromParams,
  result: 'entities'
})

export const setBaseSubpath = (req, res, next) => {
  const { lpa, dataset } = req.params
  req.baseSubpath = `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(dataset)}/data`
  next()
}

export const getDataRange = (req, res, next) => {
  const { entityCount } = req
  const { pageNumber } = req.parsedParams
  const pageLength = 50
  const recordCount = entityCount.count
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
  const { orgInfo, dataset, tableParams, issues, pagination, dataRange } = req

  req.templateParams = {
    organisation: orgInfo,
    dataset,
    taskCount: (issues?.length) ?? 0,
    tableParams,
    pagination,
    dataRange
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

  setBaseSubpath,
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchResourceStatus,
  fetchEntitiesCount,
  getDataRange,
  show404IfPageNumberNotInRange,

  fetchIf(isResourceIdInParams, fetchLatestResource, takeResourceIdFromParams),
  fetchIf(isResourceAccessible, fetchLpaDatasetIssues),

  fetchEntities,
  extractJsonFieldFromEntities,
  replaceUnderscoreInEntities,

  ...processSpecificationMiddlewares,

  constructTableParams,

  createPaginationTemplateParams,

  prepareTemplateParams,
  getGetDataview
]
