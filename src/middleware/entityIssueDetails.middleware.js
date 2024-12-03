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
  getErrorSummaryItems
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
 * @param {string} errorMessage
 * @param {{value: string}?} issue
 * @returns {string}
 */
const issueErrorMessageHtml = (errorMessage, issue) =>
    `<p class="govuk-error-message">${errorMessage}</p>${
      issue ? issue.value ?? '' : ''
    }`

/**
 *
 * @param {*} text
 * @param {*} html
 * @param {*} classes
 * @returns {{key: {text: string}, value: { html: string}, classes: string}}
 */
const getIssueField = (text, html, classes) => {
  return {
    key: {
      text
    },
    value: {
      html
    },
    classes
  }
}

export const setRecordCount = (req, res, next) => {
  req.recordCount = req.issues.length
  next()
}

export function prepareEntity (req, res, next) {
  const { entities, issues, specification } = req
  const { pageNumber, issue_type: issueType } = req.parsedParams

  const entityData = entities[pageNumber - 1]
  const entityIssues = issues.filter(issue => issue.entity === entityData.entity)

  const fields = specification.fields.map(({ field, datasetField }) => {
    const value = entityData[field] || entityData[datasetField]

    return {
      key: {
        text: field
      },
      value: {
        html: value ? value.toString() : ''
      },
      classes: ''
    }
  })

  entityIssues.forEach(issue => {
    const field = fields.find(field => field.key.text === issue.field)
    if (field) {
      const message = issue.message || issue.type
      field.value.html = issueErrorMessageHtml(message, null) + field.value.html
      field.classes += 'dl-summary-card-list__row--error'
    }
  })

  for (const issue of entityIssues) {
    if (!fields.find((field) => field.key.text === issue.field)) {
      const errorMessage = issue.message || issueType
      // TODO: pull the html out of here and into the template
      const valueHtml = issueErrorMessageHtml(errorMessage, issue.value)
      const classes = 'dl-summary-card-list__row--error'

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

/***
 * Middleware. Updates req with `templateParams`
 */
export function prepareEntityIssueDetailsTemplateParams (req, res, next) {
  const { entry, pagination, errorSummary, dataRange, dataset, orgInfo } = req
  const { issue_type: issueType } = req.params
  const { pageNumber } = req.parsedParams

  // schema: OrgIssueDetails
  req.templateParams = {
    organisation: orgInfo,
    dataset,
    errorSummary,
    entry,
    issueType,
    pagination,
    pageNumber,
    dataRange
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
  ...processRelevantIssuesMiddlewares,
  ...processEntitiesMiddlewares,
  ...processSpecificationMiddlewares,
  setRecordCount,
  getSetDataRange(1),
  show404IfPageNumberNotInRange,
  getSetBaseSubPath(['entity']),
  createPaginationTemplateParams,
  getErrorSummaryItems,
  prepareEntity,
  prepareEntityIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]
