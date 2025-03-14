import { issueErrorMessageHtml } from '../utils/utils.js'
import {
  fetchDatasetInfo,
  fetchOrgInfo,
  logPageError,
  validateQueryParams,
  createPaginationTemplateParams,
  show404IfPageNumberNotInRange,
  fetchResources,
  processRelevantIssuesMiddlewares,
  processEntitiesMiddlewares,
  processSpecificationMiddlewares,
  getSetBaseSubPath,
  getSetDataRange,
  getErrorSummaryItems,
  prepareIssueDetailsTemplateParams,
  filterOutEntitiesWithoutIssues,
  getIssueSpecification
} from './common.middleware.js'
import { renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

export const IssueDetailsQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  issue_field: v.string(),
  pageNumber: v.optional(v.pipe(v.string(), v.transform(s => parseInt(s, 10)), v.minValue(1)), '1'),
  resourceId: v.optional(v.string())
})

const validateIssueDetailsQueryParams = validateQueryParams({
  schema: IssueDetailsQueryParams
})

/**
 *
 * @param {*} text
 * @param {*} html
 * @param {*} classes
 * @returns {{key: {text: string}, value: { html: string}, classes: string}}
 */
export const getIssueField = (text, html, classes) => {
  classes = classes || ''
  return {
    key: {
      text
    },
    value: {
      html: html ? html.toString() : ''
    },
    classes
  }
}

export const setRecordCount = (req, res, next) => {
  req.recordCount = req?.issueEntities?.length || 0
  next()
}

export function prepareEntity (req, res, next) {
  const { issueEntities, issues, specification } = req
  const { pageNumber, issue_type: issueType } = req.parsedParams

  const entityData = issueEntities[pageNumber - 1]
  const entityIssues = issues.filter(issue => issue.entity === entityData.entity)

  const fields = specification.fields.map(({ field, datasetField }) => {
    const value = entityData[field] || entityData[datasetField]

    return getIssueField(field, value)
  })

  entityIssues.forEach(issue => {
    const field = fields.find(field => field.key.text === issue.field)
    if (field) {
      const message = issue.message || issue.type
      field.value.html = issueErrorMessageHtml(message, null) + field.value.html
      field.classes += 'dl-summary-card-list__row--error govuk-form-group--error'
    }
  })

  for (const issue of entityIssues) {
    if (!fields.find((field) => field.key.text === issue.field)) {
      const errorMessage = issue.message || issueType
      // TODO: pull the html out of here and into the template
      const valueHtml = issueErrorMessageHtml(errorMessage, issue.value)
      const classes = 'dl-summary-card-list__row--error govuk-form-group--error'

      fields.push(getIssueField(issue.field, valueHtml, classes))
    }
  }

  const geometries = fields
    .filter((row) => row.field === 'geometry')
    .map((row) => row.value)

  req.entry = {
    title: entityData.name || `entity: ${entityData.entity}`,
    fields,
    geometries
  }

  next()
}

/**
 * Middleware. Renders the issue details page with the list of issues, entry data,
 * and organisation and dataset details.
 */
export const getIssueDetails = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/issueDetails.html',
  handlerName: 'getIssueDetails'
})

export default [
  validateIssueDetailsQueryParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchResources,
  ...processEntitiesMiddlewares,
  ...processRelevantIssuesMiddlewares,
  ...processSpecificationMiddlewares,
  getIssueSpecification,
  filterOutEntitiesWithoutIssues,
  setRecordCount,
  getSetDataRange(1),
  show404IfPageNumberNotInRange,
  getSetBaseSubPath(['entity']),
  createPaginationTemplateParams,
  getErrorSummaryItems,
  prepareEntity,
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]
