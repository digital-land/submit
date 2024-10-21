import {
  addDatabaseFieldToSpecification,
  addDatasetFieldsToIssues,
  addIssuesToEntities,
  createPaginationTemplateParams,
  extractJsonFieldFromEntities,
  fetchActiveResourcesForOrganisationAndDataset,
  fetchDatasetInfo,
  fetchEntitiesFromIssuesWithReferences,
  fetchEntityCount,
  fetchFieldMappings,
  fetchIssuesWithoutReferences,
  fetchIssuesWithReferencesFromResourcesDatasetIssuetypefield,
  fetchOrgInfo,
  fetchSpecification,
  formatErrorSummaryParams,
  hasEntities,
  logPageError,
  nestEntityFields,
  pullOutDatasetSpecification,
  replaceUnderscoreWithHyphenForEntities,
  validateQueryParams
} from './common.middleware.js'
import { fetchIf, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'
import escapeHtml from 'escape-html'
import logger from '../utils/logger.js'

export const IssueDetailsQueryParams = v.strictObject({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  issue_field: v.string(),
  pageNumber: v.pipe(v.string(), v.transform(parseInt), v.number(), v.integer(), v.minValue(1)),
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
export const issueErrorMessageHtml = (errorMessage, issue) => {
  if (!errorMessage) return ''
  return `<p class="govuk-error-message">${errorMessage}</p>${
    escapeHtml(issue ? issue.value ?? '' : '')
  }`
}

/**
 *
 * @param {*} text
 * @param {*} html
 * @param {*} classes
 * @returns {{key: {text: string}, value: { html: string}, classes: string}}
 */
export const getIssueField = (text = '', html = '', classes = '') => {
  return {
    key: {
      text: text ?? ''
    },
    value: {
      html: html ?? ''
    },
    classes: classes ?? ''
  }
}

export const setPagePaginationOptions = (req, res, next) => {
  const { entities } = req
  const { lpa, dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params

  req.resultsCount = entities.length
  req.urlSubPath = `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(datasetId)}/${encodeURIComponent(issueType)}/${encodeURIComponent(issueField)}/entry/`
  req.paginationPageLength = 1

  next()
}

/**
 * Middleware. Prepares template parameters for the issue details page.
 *
 * @param {object} req - The request object
 * @param {object} res - The response object (not used)
 * @param {function} next - The next middleware function
 *
 * @summary Extracts relevant data from the request and organizes it into a template parameters object.
 * @description This middleware function prepares the template parameters for the issue details page.
 * It extracts the entry data, issue entities count, issues by entry number, error summary, and other relevant data
 * from the request, and organizes it into a template parameters object that can be used to render the page.
 */
export function prepareIssueDetailsTemplateParams (req, res, next) {
  const { entities, errorSummary, specification, pagination } = req
  const { issue_type: issueType, issue_field: issueField, pageNumber } = req.params

  if (!entities) {
    const error = new Error('entities is not defined')
    return next(error)
  }

  if (!specification) {
    const error = new Error('specification is not defined')
    return next(error)
  }

  if (pageNumber > entities.length || entities.length === 0) {
    const error = new Error('pageNumber out of bounds')
    error.status = 400
    return next(error)
  }

  const entity = entities[pageNumber - 1]

  const datasetFields = [...new Set(specification.fields.map(({ datasetField }) => datasetField))]

  const fields = datasetFields.map(datasetField => {
    let valueHtml = ''
    let classes = ''
    const fieldValue = entity[datasetField] || { value: '' }
    if (fieldValue.issue) {
      if (!fieldValue.issue.message) {
        logger.warn('no issue message found for issue in entity', { entity })
      }
      valueHtml += issueErrorMessageHtml(fieldValue.issue.message, null)
      classes += 'dl-summary-card-list__row--error'
    }
    valueHtml += escapeHtml(entity[datasetField]?.value || '')
    return getIssueField(datasetField, valueHtml, classes)
  })

  const entry = {
    title: `entry: ${entity.reference.value}`,
    fields,
    geometries: entity.geometry.value
  }

  // schema: OrgIssueDetails
  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
    errorSummary,
    entry,
    issueType,
    issueField,
    pagination,
    issueEntitiesCount: entities.length
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
  fetchSpecification,
  pullOutDatasetSpecification,
  fetchFieldMappings,
  addDatabaseFieldToSpecification,
  fetchActiveResourcesForOrganisationAndDataset,
  fetchIssuesWithReferencesFromResourcesDatasetIssuetypefield,
  fetchEntitiesFromIssuesWithReferences,
  fetchIssuesWithoutReferences,
  addDatasetFieldsToIssues,
  fetchIf(hasEntities, extractJsonFieldFromEntities),
  fetchIf(hasEntities, replaceUnderscoreWithHyphenForEntities),
  fetchIf(hasEntities, nestEntityFields),
  fetchIf(hasEntities, addIssuesToEntities),
  fetchEntityCount,
  formatErrorSummaryParams,
  setPagePaginationOptions,
  createPaginationTemplateParams,
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]
