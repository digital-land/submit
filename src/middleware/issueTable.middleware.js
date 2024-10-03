import performanceDbApi from '../services/performanceDbApi.js'
import { fetchDatasetInfo, fetchEntityCount, fetchLatestResource, fetchOrgInfo, fetchSpecification, isResourceIdInParams, logPageError, pullOutDatasetSpecification, takeResourceIdFromParams, validateQueryParams } from './common.middleware.js'
import { fetchIf, fetchMany, FetchOptions, parallel, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

export const IssueTableQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  issue_field: v.string(),
  pageNumber: v.optional(v.string()),
  resourceId: v.optional(v.string())
})

const validateIssueTableQueryParams = validateQueryParams.bind({
  schema: IssueTableQueryParams
})

const fetchEntitiesWithIssues = fetchMany({
  query: ({ req, params }) => performanceDbApi.entitiesAndIssuesQuery(req.resource.resource),
  result: 'entitiesWithIssues',
  dataset: FetchOptions.fromParams
})

const prepareIssueTableTemplateParams = (req, res, next) => {
  const { issue_type: issueType, issue_field: issueField, lpa, dataset: datasetId } = req.params
  const { entitiesWithIssues, specification, entityCount: entityCountRow } = req
  const { entity_count: entityCount } = entityCountRow ?? { entity_count: 0 }

  const tableParams = {
    columns: specification.fields.map(field => field.field),
    fields: specification.fields.map(field => field.field),
    rows: entitiesWithIssues.map((entity, index) => {
      const columns = {}

      specification.fields.forEach(fieldObject => {
        const { field } = fieldObject
        if (field === 'reference') {
          const entityPageNumber = index + 1
          const entityLink = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/entity/${entityPageNumber}`
          columns[field] = { html: `<a href="${entityLink}">${entity[field]}</a>` }
        } else if (entity[field]) {
          columns[field] = { value: entity[field] }
        } else {
          columns[field] = { value: '' }
        }
      })

      let issues
      try {
        issues = JSON.parse(entity.issues)
      } catch (e) {
        console.log(e)
      }

      Object.entries(issues).forEach(([field, issueType]) => {
        if (columns[field]) {
          columns[field].error = { message: issueType }
        } else {
          columns[field] = { value: '', error: { message: issueType } }
        }
      })

      return {
        columns
      }
    })
  }

  const errorHeading = performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: entitiesWithIssues.length, entityCount, field: issueField }, true)

  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
    errorHeading,
    issueItems: [],
    issueType,
    tableParams
  }
  next()
}

const getIssueTable = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/issueTable.html',
  handlerName: 'getIssueTable'
})

export default [
  validateIssueTableQueryParams,
  parallel([
    fetchOrgInfo,
    fetchDatasetInfo
  ]),
  fetchIf(isResourceIdInParams, fetchLatestResource, takeResourceIdFromParams),
  fetchEntitiesWithIssues,
  fetchSpecification,
  pullOutDatasetSpecification,
  fetchEntityCount,
  prepareIssueTableTemplateParams,
  getIssueTable,
  logPageError
]
