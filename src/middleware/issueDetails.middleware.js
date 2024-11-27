import performanceDbApi, { issuesQueryLimit } from '../services/performanceDbApi.js'
import {
  fetchDatasetInfo,
  fetchEntityCount,
  fetchLatestResource,
  fetchOrgInfo,
  isResourceIdInParams, isResourceDataPresent,
  logPageError,
  takeResourceIdFromParams,
  validateQueryParams,
  createPaginationTemplateParams,
  show404IfPageNumberNotInRange
} from './common.middleware.js'
import { fetchIf, fetchMany, fetchOne, FetchOptions, handleRejections, renderTemplate } from './middleware.builders.js'
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
 * Middleware. Updates `req` with `issues`.
 *
 * Requires resource id under `req.resource.resource`.
 */
const fetchIssues = fetchMany({
  query: ({ req }) => performanceDbApi.getIssuesQuery(req),
  result: 'issues',
  dataset: FetchOptions.fromParams
})

/**
 *
 * Middleware. Updates `req` with `issuesByEntryNumber` and `entryNumberCount`.
 *
 * Requires `issues` in request.
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function reformatIssuesToBeByEntryNumber (req, res, next) {
  const { issues } = req
  const count = new Set()
  const issuesByEntryNumber = issues.reduce((acc, current) => {
    acc[current.entry_number] = acc[current.entry_number] || []
    acc[current.entry_number].push(current)
    count.add(current.entry_number)
    return acc
  }, {})
  req.issuesByEntryNumber = issuesByEntryNumber
  req.entryNumberCount = count.size
  next()
}

/**
 *
 * Middleware. Updates `req` with `entryData`
 *
 * Requires `pageNumber`, `dataset`, `issuesByEntryNumber`, `resource`
 *
 * @param {{ issuesByEntryNumber: Object, resource: { resource: string },  params: { dataset: string }, parsedParams: { pageNumber: number }}} req
 * @param {*} res
 * @param {*} next
 *
 */
async function fetchEntry (req, res, next) {
  const { dataset: datasetId } = req.params
  const { issues, issueEntitiesCount, issuesByEntryNumber } = req
  const { pageNumber } = req.parsedParams

  let entryData
  const issuesByEntry = Object.values(issuesByEntryNumber)
  if (issues.length > 0) {
    if (pageNumber <= issueEntitiesCount.count) {
      const entryIssues = issuesByEntry[(pageNumber - 1) % issuesQueryLimit] ?? []
      const entryNum = entryIssues.length > 0 ? entryIssues[0].entry_number : undefined
      entryData = entryNum
        ? await performanceDbApi.getEntry(
          req.resource.resource,
          entryNum,
          datasetId
        )
        : []
    }
  }

  req.entryData = entryData ?? []
  next()
}

/**
 * Middleware. Updates `req` with `issueEntitiesCount` which is the count of entities that have issues.
 */
const fetchIssueEntitiesCount = fetchOne({
  query: ({ req }) => performanceDbApi.getEntitiesWithIssuesCountQuery(req),
  result: 'issueEntitiesCount',
  dataset: FetchOptions.fromParams
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

/**
 *
 * @param {*} issueType
 * @param {*} issuesByEntryNumber
 * @param {*} row
 * @returns {{key: {text: string}, value: { html: string}, classes: string}}
 */
const processEntryRow = (issueType, issuesByEntryNumber, row) => {
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

export const setBaseSubpath = (req, res, next) => {
  const { lpa, dataset, issue_type: issueType, issue_field: issueField } = req.params
  req.baseSubpath = `/organisations/${lpa}/${dataset}/${issueType}/${issueField}/entry`
  next()
}

export const getDataRange = (req, res, next) => {
  const { pageNumber } = req.parsedParams
  const { issueEntitiesCount: issueEntitiesCountObj } = req
  const { count: issueEntitiesCount } = issueEntitiesCountObj

  const pageLength = 1
  const recordCount = issueEntitiesCount
  req.dataRange = {
    minRow: (pageNumber - 1) * pageLength,
    maxRow: Math.min((pageNumber - 1) * pageLength + pageLength, recordCount),
    totalRows: recordCount,
    maxPageNumber: recordCount,
    pageLength: 1
  }
  next()
}

/***
 * Middleware. Updates req with `templateParams`
 */
export function prepareIssueDetailsTemplateParams (req, res, next) {
  const { entryData, issueEntitiesCount: issueEntitiesCountObj, issuesByEntryNumber, entryNumberCount, entityCount: entityCountRow, pagination, baseSubpath } = req
  const { count: issueEntitiesCount } = issueEntitiesCountObj
  const { issue_type: issueType, issue_field: issueField } = req.params
  const { pageNumber } = req.parsedParams
  const { entity_count: entityCount } = entityCountRow ?? { entity_count: 0 }

  let errorHeading
  let issueItems

  if (entryNumberCount < entityCount) {
    errorHeading = performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issueEntitiesCount, entityCount, field: issueField }, true)
    issueItems = Object.entries(issuesByEntryNumber).map(([entryNumber, issues], i) => {
      const pageNum = i + 1
      return {
        html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: 1, field: issueField }) + ` in record ${entryNumber}`,
        href: `${baseSubpath}/${pageNum}`
      }
    })
  } else {
    issueItems = [{
      html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issueEntitiesCount, entityCount, field: issueField }, true)
    }]
  }

  const fields = entryData.map((row) => processEntryRow(issueType, issuesByEntryNumber, row))
  const entityIssues = Object.values(issuesByEntryNumber)[pageNumber - 1] || []
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
    title: `entry: ${entryData.length > 0 ? entryData[0].entry_number : ''}`,
    fields,
    geometries
  }

  // schema: OrgIssueDetails
  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
    errorSummary: {
      heading: errorHeading,
      items: issueItems
    },
    entry,
    issueType,
    pagination,
    issueEntitiesCount,
    pageNumber
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

/* eslint-disable no-return-assign */
const zeroEntityCount = (req) => req.entityCount = { entity_count: 0 }
const zeroIssueEntitiesCount = (req) => req.issueEntitiesCount = { count: 0 }
const emptyIssuesCollection = (req) => req.issues = []

export default [
  validateIssueDetailsQueryParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchIf(isResourceIdInParams, fetchLatestResource, takeResourceIdFromParams),
  fetchIf(isResourceDataPresent, fetchIssues, emptyIssuesCollection),
  reformatIssuesToBeByEntryNumber,
  fetchIf(isResourceDataPresent, fetchIssueEntitiesCount, zeroIssueEntitiesCount),
  handleRejections(fetchEntry),
  fetchIf(isResourceDataPresent, fetchEntityCount, zeroEntityCount),
  setBaseSubpath,
  getDataRange,
  show404IfPageNumberNotInRange,
  createPaginationTemplateParams,
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]
