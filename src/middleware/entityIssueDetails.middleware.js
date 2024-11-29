import performanceDbApi from '../services/performanceDbApi.js'
import logger from '../utils/logger.js'
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
  processSpecificationMiddlewares
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

export const setBaseSubpath = (req, res, next) => {
  const { lpa, dataset, issue_type: issueType, issue_field: issueField } = req.params
  req.baseSubpath = `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(dataset)}/${encodeURIComponent(issueType)}/${encodeURIComponent(issueField)}/entity`
  next()
}

export const getDataRange = (req, res, next) => {
  const { pageNumber } = req.parsedParams
  const { issues } = req

  const pageLength = 1
  const recordCount = issues.length
  req.dataRange = {
    minRow: (pageNumber - 1) * pageLength,
    maxRow: Math.min((pageNumber - 1) * pageLength + pageLength, recordCount),
    totalRows: recordCount,
    maxPageNumber: recordCount,
    pageLength: 1
  }
  next()
}

export function getErrorSummaryItems (req, res, next) {
  const { issue_type: issueType, issue_field: issueField, baseSubpath } = req.params

  const { entities, issues } = req

  let errorHeading = ''
  let issueItems

  if (issues.length <= 0) {
    // currently the task list page is getting its issues incorrectly, not factoring in the fact that an issue might have been fixed.
    logger.warn(`issueTable was accessed from ${req.headers.referer} but there was no issues`)
    const error = new Error('issue count must be larger than 0')
    return next(error)
  } else if (issues.length < entities.length) {
    errorHeading = performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issues.length, entityCount: entities.length, field: issueField }, true)
    issueItems = issues.map((issue, i) => {
      const pageNum = i + 1
      return {
        html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: 1, field: issueField }) + ` in entity ${issue.entity}`,
        href: `${baseSubpath}/${pageNum}`
      }
    })
  } else {
    issueItems = [{
      html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issues.length, entityCount: entities.length, field: issueField }, true)
    }]
  }

  req.errorSummary = {
    heading: errorHeading,
    items: issueItems
  }

  next()
}

/***
 * Middleware. Updates req with `templateParams`
 */
export function prepareIssueDetailsTemplateParams (req, res, next) {
  const { entities, issues, pagination, errorSummary, dataRange } = req
  const { issue_type: issueType } = req.params
  const { pageNumber } = req.parsedParams

  const entityData = entities[pageNumber - 1]
  const entityIssues = issues.filter(issue => issue.entity === entityData.entity)

  const fields = Object.entries(entityData).map(([field, value]) => ({
    key: {
      text: field
    },
    value: {
      html: value ? value.toString() : ''
    },
    classes: ''
  }))

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
  const entry = {
    title: entityData.name || `entity: ${entityData.entity}`,
    fields,
    geometries
  }

  // schema: OrgIssueDetails
  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
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
  getDataRange,
  show404IfPageNumberNotInRange,
  setBaseSubpath,
  createPaginationTemplateParams,
  getErrorSummaryItems,
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]
