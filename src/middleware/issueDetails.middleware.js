import performanceDbApi from '../services/performanceDbApi.js'
import { fetchDatasetInfo, fetchEntityCount, fetchIssueEntitiesCount, fetchIssues, fetchLatestResource, fetchOrgInfo, formatErrorSummaryParams, isResourceIdNotInParams, logPageError, reformatIssuesToBeByEntryNumber, takeResourceIdFromParams, validateQueryParams } from './common.middleware.js'
import { fetchIf, parallel, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'
import { pagination } from '../utils/pagination.js'

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
 * Middleware. Updates `req` with `entryData`
 *
 * Requires `dataset` and `entryNumber`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 *
 */
async function fetchEntry (req, res, next) {
  const { dataset: datasetId } = req.params
  const { entryNumber } = req

  req.entryData = await performanceDbApi.getEntry(
    req.resource.resource,
    entryNumber,
    datasetId
  )

  next()
}

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

/**
 *
 * @param {*} issueType
 * @param {*} issuesByEntryNumber
 * @param {*} row
 * @returns {{key: {text: string}, value: { html: string}, classes: string}}
 */
const processEntryRow = (issueType, issuesByEntryNumber = {}, row) => {
  const { entry_number: entryNumber } = row
  console.assert(entryNumber, 'precessEntryRow(): entry_number not in row')

  let hasError = false
  let issueIndex
  if (issuesByEntryNumber[entryNumber]) {
    issueIndex = issuesByEntryNumber[entryNumber].findIndex(
      (issue) => issue.field === row.field
    )
    hasError = issueIndex >= 0
  }

  let valueHtml = ''
  let classes = ''
  if (hasError) {
    const message =
        issuesByEntryNumber[entryNumber][issueIndex].message || issueType
    valueHtml += issueErrorMessageHtml(message, null)
    classes += 'dl-summary-card-list__row--error'
  }
  valueHtml += row.value

  return getIssueField(row.field, valueHtml, classes)
}

/**
 * Middleware. Extracts the entry number from the page number in the request.
 *
 * @param {object} req - The request object
 * @param {object} res - The response object
 * @param {function} next - The next middleware function
 *
 * @throws {Error} If the page number cannot be parsed as an integer
 * @throws {Error} If the entry number is not found (404)
 */
export function getEntryNumberFromPageNumber (req, res, next) {
  const { issuesByEntryNumber } = req
  const { pageNumber } = req.params

  const pageNumberAsInt = parseInt(pageNumber)
  if (isNaN(pageNumberAsInt)) {
    const error = new Error('page number could not be parsed as an integer')
    error.status = 400
    return next(error)
  }

  const issuesByEntryNumberIndex = pageNumberAsInt - 1
  const pageNumberToEntryNumberMap = Object.keys(issuesByEntryNumber)

  if (issuesByEntryNumberIndex < 0 || issuesByEntryNumberIndex >= pageNumberToEntryNumberMap.length) {
    const error = new Error('not found')
    error.status = 404
    return next(error)
  }

  req.entryNumber = pageNumberToEntryNumberMap[issuesByEntryNumberIndex]
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
  const { entryData, issueEntitiesCount, issuesByEntryNumber, errorSummary, entryNumber } = req
  const { lpa, dataset: datasetId, issue_type: issueType, issue_field: issueField, pageNumber: pageNumberString } = req.params
  const pageNumber = parseInt(pageNumberString)

  const BaseSubpath = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/entry/`

  const fields = entryData.map((row) => processEntryRow(issueType, issuesByEntryNumber, row))
  const entityIssues = issuesByEntryNumber[entryNumber] || []
  for (const issue of entityIssues) {
    if (!fields.find((field) => field.key.text === issue.field)) {
      const errorMessage = issue.message || issueType
      // TODO: pull the html out of here and into the template
      const valueHtml = issueErrorMessageHtml(errorMessage, issue.value)
      const classes = 'dl-summary-card-list__row--error'

      fields.push(getIssueField(issue.field, valueHtml, classes))
    }
  }

  const geometries = entryData
    .filter((row) => row.field === 'geometry')
    .map((row) => row.value)
  const entry = {
    title: `entry: ${entryNumber}`,
    fields,
    geometries
  }

  const paginationObj = {
    items: []
  }

  const entryNumbers = Object.keys(issuesByEntryNumber)

  if (pageNumber > 1) {
    paginationObj.previous = {
      href: `${BaseSubpath}${pageNumber - 1}`
    }
  }

  if (pageNumber < entryNumbers.length) {
    paginationObj.next = {
      href: `${BaseSubpath}${pageNumber + 1}`
    }
  }

  paginationObj.items = pagination(issueEntitiesCount, pageNumber).map(item => {
    if (item === '...') {
      return {
        type: 'ellipsis',
        ellipsis: true,
        href: '#'
      }
    } else {
      return {
        type: 'number',
        number: item,
        href: `${BaseSubpath}${item}`,
        current: pageNumber === parseInt(item)
      }
    }
  })

  // schema: OrgIssueDetails
  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
    errorSummary,
    entry,
    issueType,
    issueField,
    pagination: paginationObj,
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
  fetchIssues,
  reformatIssuesToBeByEntryNumber,
  getEntryNumberFromPageNumber,
  parallel([
    fetchEntry,
    fetchEntityCount,
    fetchIssueEntitiesCount
  ]),
  formatErrorSummaryParams,
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]
