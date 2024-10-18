import {
  validateQueryParams,
  addIssuesToEntities,
  extractJsonFieldFromEntities,
  fetchDatasetInfo,
  fetchEntityCount,
  fetchLatestResource,
  fetchOrgInfo,
  fetchSpecification,
  formatErrorSummaryParams,
  getPaginationOptions,
  hasEntities,
  isResourceIdNotInParams,
  logPageError,
  nestEntityFields,
  paginateEntitiesAndPullOutCount,
  pullOutDatasetSpecification,
  replaceUnderscoreWithHyphenForEntities,
  takeResourceIdFromParams,
  fetchActiveResourcesForOrganisationAndDataset,
  fetchIssuesWithReferencesFromResourcesDatasetIssuetypefield,
  fetchEntitiesFromIssuesWithReferences,
  fetchIssuesWithoutReferences,
  createPaginationTemplateParams,
  fetchFieldMappings,
  addDatabaseFieldToSpecification,
  addDatasetFieldsToIssues
} from './common.middleware.js'
import { fetchIf, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

const paginationPageLength = 20

export const IssueTableQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  issue_field: v.string(),
  pageNumber: v.optional(v.pipe(v.string(), v.transform(parseInt), v.number(), v.integer(), v.minValue(1))),
  resourceId: v.optional(v.string())
})

const validateIssueTableQueryParams = validateQueryParams({
  schema: IssueTableQueryParams
})

export const setDefaultQueryParams = (req, res, next) => {
  if (!req.params.pageNumber) {
    req.params.pageNumber = 1
  }
  next()
}

export const addEntityPageNumberToEntity = (req, res, next) => {
  const { entities } = req

  req.entities = entities.map((entity, index) => ({ ...entity, entityPageNumber: index + 1 }))

  next()
}

export const setPagePageOptions = (pageLength) => (req, res, next) => {
  const { entitiesWithIssuesCount } = req
  const { lpa, dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params

  req.resultsCount = entitiesWithIssuesCount
  req.urlSubPath = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/`
  req.paginationPageLength = pageLength

  next()
}

/**
 * Middleware function to prepare issue table template params
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Next function in the middleware chain
 */
export const prepareIssueTableTemplateParams = (req, res, next) => {
  const { issue_type: issueType, issue_field: issueField, lpa, dataset: datasetId } = req.params
  const { entities, specification, pagination, errorSummary } = req

  const columnHeaders = [...new Set(specification.fields.map(field => field.datasetField || field.field))]

  const tableParams = {
    columns: columnHeaders,
    fields: columnHeaders,
    rows: entities.map((entity, index) => {
      const columns = {}
      columnHeaders.forEach(field => {
        if (field === 'reference') {
          const entityLink = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/entry/${entity.entityPageNumber}`
          columns[field] = { html: `<a href="${entityLink}">${entity[field].value}</a>`, error: entity[field].issue }
        } else if (entity[field]) {
          columns[field] = { value: entity[field].value, error: entity[field].issue }
        } else {
          columns[field] = { value: '' }
        }
      })

      return {
        columns
      }
    })
  }

  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
    errorSummary,
    issueType,
    tableParams,
    pagination
  }
  next()
}

export const getIssueTable = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/issueTable.html',
  handlerName: 'getIssueTable'
})

export default [
  validateIssueTableQueryParams,
  setDefaultQueryParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchIf(isResourceIdNotInParams, fetchLatestResource, takeResourceIdFromParams),
  fetchSpecification,
  pullOutDatasetSpecification,
  fetchFieldMappings,
  addDatabaseFieldToSpecification,
  getPaginationOptions(paginationPageLength),
  fetchActiveResourcesForOrganisationAndDataset,
  fetchIssuesWithReferencesFromResourcesDatasetIssuetypefield,
  fetchEntitiesFromIssuesWithReferences,
  fetchIssuesWithoutReferences,
  addDatasetFieldsToIssues,
  fetchIf(hasEntities, addEntityPageNumberToEntity),
  fetchIf(hasEntities, paginateEntitiesAndPullOutCount),
  fetchEntityCount,
  formatErrorSummaryParams,
  fetchIf(hasEntities, extractJsonFieldFromEntities),
  fetchIf(hasEntities, replaceUnderscoreWithHyphenForEntities),
  fetchIf(hasEntities, nestEntityFields),
  fetchIf(hasEntities, addIssuesToEntities),
  setPagePageOptions(paginationPageLength),
  createPaginationTemplateParams,
  prepareIssueTableTemplateParams,
  getIssueTable,
  logPageError
]
