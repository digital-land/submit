import performanceDbApi from '../services/performanceDbApi.js'
import { fetchDatasetInfo, fetchLatestResource, fetchOrgInfo, fetchSpecification, isResourceIdInParams, logPageError, pullOutDatasetSpecification, takeResourceIdFromParams } from './common.middleware.js'
import { fetchIf, fetchMany, FetchOptions, parallel, renderTemplate } from './middleware.builders.js'

const validateIssueTableQueryParams = (req, res, next) => {
  next()
}

// given an lpa and a dataset, we want to get all the entities with issues, and their accompanying issues
const fetchEntitiesWithIssues = fetchMany({
  query: ({ req, params }) => performanceDbApi.entitiesAndIssuesQuery(req.resource.resource),
  result: 'entitiesWithIssues',
  dataset: FetchOptions.fromParams
})

const prepareIssueTableTemplateParams = (req, res, next) => {
  const { issue_type: issueType } = req.params
  const { entitiesWithIssues, specification } = req

  const tableParams = {
    columns: specification.fields.map(field => field.field),
    fields: specification.fields.map(field => field.field),
    rows: entitiesWithIssues.map(entity => {
      const columns = {}

      specification.fields.forEach(fieldObject => {
        const { field } = fieldObject
        if (entity[field]) {
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

  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
    errorHeading: 'error Heading (ToDo)',
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
  prepareIssueTableTemplateParams,
  getIssueTable,
  logPageError
]
