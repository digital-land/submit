import config from '../../config/index.js'
import {
  createPaginationTemplateParams,
  extractJsonFieldFromEntities,
  fetchDatasetInfo,
  fetchOrgInfo,
  processSpecificationMiddlewares,
  replaceUnderscoreInEntities,
  setDefaultParams,
  validateQueryParams,
  show404IfPageNumberNotInRange,
  getSetBaseSubPath,
  getSetDataRange,
  logPageError,
  fetchResources,
  fetchEntityCount,
  fetchEntityIssueCounts,
  fetchEntryIssueCounts,
  fetchEntitiesPlatformDb,
  prepareAuthority
} from './common.middleware.js'
import { fetchMany, FetchOptions, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'
import { splitByLeading } from '../utils/table.js'

export const dataviewQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  pageNumber: v.optional(v.pipe(v.string(), v.transform(s => parseInt(s, 10)), v.minValue(1)), '1'),
  resourceId: v.optional(v.string())
})

const validatedataviewQueryParams = validateQueryParams({
  schema: dataviewQueryParams
})

export const fetchEntities = fetchMany({
  query: ({ req, params }) => `SELECT * FROM entity WHERE organisation_entity = ${req.orgInfo.entity} LIMIT ${req.dataRange.pageLength} OFFSET ${req.dataRange.offset}`,
  dataset: FetchOptions.fromParams,
  result: 'entities'
})

export const setRecordCount = (req, res, next) => {
  req.recordCount = req?.entityCount?.count || 0
  next()
}

export const constructTableParams = (req, res, next) => {
  const { entities, uniqueDatasetFields } = req
  const { leading: leadingFields, trailing: trailingFields } = splitByLeading({ fields: uniqueDatasetFields })
  const orderedDatasetFields = [...leadingFields, ...trailingFields]
  const columns = orderedDatasetFields
  const fields = orderedDatasetFields
  const rows = entities.map(entity => ({
    columns: Object.fromEntries(fields.map(field => {
      let value = entity[field]
      const classes = ''
      let html

      const urlRegex = /^https?:\/\/[^\s]+$/
      if (urlRegex.test(entity[field])) {
        html = `<a href='${entity[field]}' target='_blank' rel='noopener noreferrer' aria-label='${entity[field]} (opens in new tab)'>${entity[field]}</a>`
        value = undefined
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
  const { orgInfo, dataset, tableParams, pagination, dataRange, entityIssueCounts, entryIssueCounts, authority } = req

  // Hard code task count for 'some' authority
  const taskCount = authority !== 'some' ? entityIssueCounts.length + entryIssueCounts.length : 1
  const downloadUrl = config.downloadUrl + `/${encodeURIComponent(dataset.dataset)}.csv?orgEntity=${encodeURIComponent(orgInfo.entity)}&quality=${encodeURIComponent(authority)}`

  req.templateParams = {
    downloadUrl,
    organisation: orgInfo,
    authority,
    dataset,
    taskCount,
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

  getSetBaseSubPath(['data']),
  fetchOrgInfo,
  fetchDatasetInfo,

  fetchResources,
  fetchEntityIssueCounts,
  fetchEntryIssueCounts,

  fetchEntityCount,
  setRecordCount,

  getSetDataRange(config.tablePageLength),
  show404IfPageNumberNotInRange,

  prepareAuthority, // Used to see if alternative or authoritative, and update entites fetch accordingly
  fetchEntitiesPlatformDb, // This technically fetches twice from entities table, could be refactored later
  extractJsonFieldFromEntities,
  replaceUnderscoreInEntities,

  ...processSpecificationMiddlewares,

  constructTableParams,

  createPaginationTemplateParams,

  prepareTemplateParams,
  getGetDataview,

  logPageError
]
