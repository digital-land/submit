import {
  addIssuesToEntities,
  createPaginationTemplateParams,
  extractJsonFieldFromEntities,
  fetchActiveResourcesForOrganisationAndDataset,
  fetchDatasetInfo,
  fetchEntitiesFromIssuesWithReferences,
  fetchEntityCount,
  fetchIssueEntitiesCount,
  fetchIssuesWithoutReferences,
  fetchIssuesWithReferencesFromResourcesDatasetIssuetypefield,
  fetchLatestResource,
  fetchOrgInfo,
  fetchSpecification,
  formatErrorSummaryParams,
  hasEntities,
  isResourceIdNotInParams,
  logPageError,
  nestEntityFields,
  pullOutDatasetSpecification,
  replaceUnderscoreWithHyphenForEntities,
  takeResourceIdFromParams,
  validateQueryParams
} from './common.middleware.js'
import { fetchIf, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

export const IssueDetailsQueryParams = v.strictObject({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  issue_field: v.string(),
  pageNumber: v.string(),
  resourceId: v.optional(v.string())
})

const validateIssueDetailsQueryParams = validateQueryParams.bind({
  schema: IssueDetailsQueryParams
})

/**
 *
 * @param {string} errorMessage
 * @param {{value: string}?} issue
 * @returns {string}
 */
export const issueErrorMessageHtml = (errorMessage, issue) =>
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
export const getIssueField = (text, html, classes = '') => {
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

export const setPagePaginationOptions = (req, res, next) => {
  const { issueEntitiesCount } = req
  const { lpa, dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params

  req.resultsCount = issueEntitiesCount.length
  req.urlSubPath = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/entry/`
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
  const { entities, issueEntitiesCount, errorSummary, specification, pagination } = req
  const { issue_type: issueType, issue_field: issueField, pageNumber: pageNumberString } = req.params
  const pageNumber = parseInt(pageNumberString)

  const entity = entities[pageNumber - 1]

  const fields = specification.fields.map(({ field }) => {
    let valueHtml = ''
    let classes = ''
    if (!entity[field]) {
      entity[field] = {
        value: ''
      }
    }
    if (entity[field].issue) {
      valueHtml += issueErrorMessageHtml(entity[field].issue.message, null)
      classes += 'dl-summary-card-list__row--error'
    }
    valueHtml += entity[field].value || ''
    return getIssueField(field, valueHtml, classes)
  })

  const entry = {
    title: `entry: ${entity.reference.value}`,
    fields,
    geometries: [entity.geometry.value]
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
    issueEntitiesCount
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
  fetchIf(isResourceIdNotInParams, fetchLatestResource, takeResourceIdFromParams),
  fetchSpecification,
  pullOutDatasetSpecification,
  fetchActiveResourcesForOrganisationAndDataset,
  fetchIssuesWithoutReferences,
  fetchIssuesWithReferencesFromResourcesDatasetIssuetypefield,
  fetchEntitiesFromIssuesWithReferences,
  fetchIf(hasEntities, extractJsonFieldFromEntities),
  fetchIf(hasEntities, replaceUnderscoreWithHyphenForEntities),
  fetchIf(hasEntities, nestEntityFields),
  fetchIf(hasEntities, addIssuesToEntities),
  fetchEntityCount,
  fetchIssueEntitiesCount,
  formatErrorSummaryParams,
  setPagePaginationOptions,
  createPaginationTemplateParams,
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]
