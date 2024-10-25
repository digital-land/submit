import performanceDbApi from '../services/performanceDbApi.js'
import {
  fetchDatasetInfo,
  fetchEntityCount,
  fetchLatestResource,
  fetchOrgInfo,
  isResourceIdInParams, isResourceDataPresent,
  logPageError,
  takeResourceIdFromParams,
  validateQueryParams
} from './common.middleware.js'
import { fetchIf, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'
import { pagination } from '../utils/pagination.js'

export const IssueDetailsQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  issue_field: v.string(),
  pageNumber: v.optional(v.string()),
  resourceId: v.optional(v.string())
})

const validateIssueDetailsQueryParams = validateQueryParams({
  schema: IssueDetailsQueryParams
})

/**
 *
 * Middleware. Updates `req` with `issues`.
 *
 * Requires resource id under `req.resource.resource`.
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function fetchIssues (req, res, next) {
  const { dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params
  const resourceId = req.resource.resource
  try {
    const issues = await performanceDbApi.getIssues({ resource: resourceId, issueType, issueField }, datasetId)
    req.issues = issues
    next()
  } catch (error) {
    next(error)
  }
}

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
 * Middleware. Updates `req` with `entryData`, `entryNumber`
 *
 * Requires `pageNumber`, `dataset`, `issuesByEntryNumber`, `resource`
 *
 * @param {{ issuesByEntryNumber: Object, resource: { resource: string },  params: { dataset: string }}} req
 * @param {*} res
 * @param {*} next
 *
 */
async function fetchEntry (req, res, next) {
  const { dataset: datasetId } = req.params
  const { issuesByEntryNumber, pageNumber: pageNum } = req

  let entryData
  let entryNum
  const issuesByEntry = Object.values(issuesByEntryNumber)
  if ((pageNum - 1) < issuesByEntry.length) {
    const issues = issuesByEntry[pageNum - 1]
    entryNum = issues.length > 0 ? issues[0].entry_number : undefined
    entryData = await performanceDbApi.getEntry(
      req.resource.resource,
      entryNum,
      datasetId
    )
  } else {
    entryNum = undefined
    entryData = []
  }

  req.entryData = entryData
  req.entryNumber = entryNum
  next()
}

/**
 *
 * Middleware. Updates `req` with `issueEntitiesCount` which is the count of entities that have issues.
 *
 * Requires `req.resource.resource`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function fetchIssueEntitiesCount (req, res, next) {
  const { dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params
  const { resource: resourceId } = req.resource
  const issueEntitiesCount = await performanceDbApi.getEntitiesWithIssuesCount({ resource: resourceId, issueType, issueField }, datasetId)
  req.issueEntitiesCount = parseInt(issueEntitiesCount)
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

/***
 * Middleware. Updates req with `templateParams`
 */
export function prepareIssueDetailsTemplateParams (req, res, next) {
  const { entryData, pageNumber, issueEntitiesCount, issuesByEntryNumber, entryNumberCount, entryNumber, entityCount: entityCountRow } = req
  const { lpa, dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params
  const { entity_count: entityCount } = entityCountRow ?? { entity_count: 0 }

  let errorHeading
  let issueItems

  const BaseSubpath = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/`

  if (entryNumberCount < entityCount) {
    errorHeading = performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issueEntitiesCount, entityCount, field: issueField }, true)
    issueItems = Object.entries(issuesByEntryNumber).map(([entryNumber, issues], i) => {
      const pageNum = i + 1
      return {
        html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: 1, field: issueField }) + ` in record ${entryNumber}`,
        href: `${BaseSubpath}${pageNum}`
      }
    })
  } else {
    issueItems = [{
      html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issueEntitiesCount, entityCount, field: issueField }, true)
    }]
  }

  // for whatever reason `issuesByEntryNumber` is only 1k long max, so wa can't have more pages
  // than that, even if there are more entities with issues
  const maxPageNumber = Math.min(issueEntitiesCount, entryNumberCount)

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
    title: `entry: ${entryNumber}`,
    fields,
    geometries
  }

  const paginationObj = {}
  if (pageNumber > 1) {
    paginationObj.previous = {
      href: `${BaseSubpath}${pageNumber - 1}`
    }
  }

  if (pageNumber < maxPageNumber) {
    paginationObj.next = {
      href: `${BaseSubpath}${pageNumber + 1}`
    }
  }

  paginationObj.items = pagination(maxPageNumber, pageNumber).map(item => {
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
    errorHeading,
    issueItems,
    entry,
    issueType,
    pagination: paginationObj,
    issueEntitiesCount,
    pageNumber
  }

  next()
}

/**
 * Middleware. Short-circuits with 404 error if pageNumber is not in range.
 * Updates req with `pageNumber`
 *
 * @param req
 * @param res
 * @param next
 */
const isPageNumberInRange = (req, res, next) => {
  const { pageNumber } = req.params
  const { entryNumberCount } = req
  const pageNum = pageNumber ? parseInt(pageNumber) : 1
  req.pageNumber = pageNum

  if (pageNumber < 0 || entryNumberCount < pageNumber) {
    res.status(404).render('errorPages/404', {})
    return
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
const zeroEntityCount = (req) => req.entityCount = 0
const zeroIssueEntitiesCount = (req) => req.issueEntitiesCount = 0
const emptyIssuesCollection = (req) => req.issues = []

export default [
  validateIssueDetailsQueryParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchIf(isResourceIdInParams, fetchLatestResource, takeResourceIdFromParams),
  fetchIf(isResourceDataPresent, fetchIssues, emptyIssuesCollection),
  reformatIssuesToBeByEntryNumber,
  isPageNumberInRange,
  fetchEntry,
  fetchIf(isResourceDataPresent, fetchEntityCount, zeroEntityCount),
  fetchIf(isResourceDataPresent, fetchIssueEntitiesCount, zeroIssueEntitiesCount),
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]
