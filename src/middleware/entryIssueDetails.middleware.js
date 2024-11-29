import * as v from 'valibot'
import { createPaginationTemplateParams, fetchDatasetInfo, fetchOrgInfo, fetchResources, show404IfPageNumberNotInRange, validateQueryParams } from './common.middleware.js'
import { fetchMany, FetchOptions, renderTemplate } from './middleware.builders.js'
import logger from '../utils/logger.js'
import performanceDbApi from '../services/performanceDbApi.js'

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

const fetchResourceMetaData = fetchMany({
  query: ({ req }) => `
    select entity_count, entry_count, line_count, mime_type, internal_path, internal_mime_type, resource 
    FROM dataset_resource 
    WHERE resource in ('${req.resources.map(resource => resource.resource).join("', '")}')
  `,
  dataset: FetchOptions.fromParams,
  result: 'resourceMetaData'
})

const addResourceMetaDataToResources = (req, res, next) => {
  const { resources, resourceMetaData } = req

  req.resources = resources.map(resource => {
    const metaData = resourceMetaData.find(metaData => metaData.resource === resource.resource)
    if (metaData) {
      return { ...resource, ...resourceMetaData }
    }
    return resource
  })

  next()
}

// We can only get the issues without entity from the latest resource as we have no way of knowing if those in previous resources have been fixed?
const fetchEntryIssues = fetchMany({
  query: ({ req, params }) => `
    select * 
    from issue i
    LEFT JOIN issue_type it ON i.issue_type = it.issue_type
    WHERE resource = '${req.resources[0].resource}'
    AND issue_type = '${params.issue_type}'
    AND it.responsibility = 'external'
    AND field = '${params.issue_field}'
  `,
  dataset: FetchOptions.fromParams,
  result: 'issues'
})

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

export const setBaseSubpath = (req, res, next) => {
  const { lpa, dataset, issue_type: issueType, issue_field: issueField } = req.params
  req.baseSubpath = `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(dataset)}/${encodeURIComponent(issueType)}/${encodeURIComponent(issueField)}/entry`
  next()
}

export function getErrorSummaryItems (req, res, next) {
  const { issue_type: issueType, issue_field: issueField } = req.params
  const { baseSubpath, resources } = req

  const { issues } = req

  const entryCount = resources[0].entry_count

  let errorHeading = ''
  let issueItems

  if (issues.length <= 0) {
    // currently the task list page is getting its issues incorrectly, not factoring in the fact that an issue might have been fixed.
    logger.warn(`entry issue details was accessed from ${req.headers.referer} but there was no issues`)
    const error = new Error('issue count must be larger than 0')
    return next(error)
  } else if (issues.length < entryCount) {
    errorHeading = performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issues.length, entityCount: entryCount, field: issueField }, true)
    issueItems = issues.map((issue, i) => {
      const pageNum = i + 1
      return {
        html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: 1, field: issueField }) + ` in entity ${issue.entity}`,
        href: `${baseSubpath}/${pageNum}`
      }
    })
  } else {
    issueItems = [{
      html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issues.length, entityCount: entryCount, field: issueField }, true)
    }]
  }

  req.errorSummary = {
    heading: errorHeading,
    items: issueItems
  }

  next()
}

// what we show in the table
// - resource
// - line number
// - reference

const prepareEntry = (req, res, next) => {
  const { resources, issues } = req
  const { pageNumber } = req.parsedParams

  const issue = issues[pageNumber - 1]

  req.entry = {
    title: `entry: ${issue.entry_number}`,
    fields: [
      {
        key: {
          text: 'Endpoint'
        },
        value: {
          html: `<a href='${resources[0].endpoint_url}'>${resources[0].endpoint_url}</a>`
        },
        classes: ''
      },
      {
        key: {
          text: 'Line number'
        },
        value: {
          html: issue.line_number.toString()
        },
        classes: ''
      },
      {
        key: {
          text: issue.field
        },
        value: {
          html: `<p class="govuk-error-message">${issue.message || issue.issue_type}</p>${issue.value}`
        },
        classes: ''
      }
    ]
  }
  next()
}

const prepareEntryIssueDetailsTemplateParams = (req, res, next) => {
  const { issue_type: issueType, pageNumber } = req.parsedParams
  const { entry, pagination, dataRange, errorSummary, dataset, orgInfo } = req

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
  fetchResourceMetaData,
  addResourceMetaDataToResources,
  fetchEntryIssues,
  getDataRange,
  show404IfPageNumberNotInRange,
  setBaseSubpath,
  createPaginationTemplateParams,
  getErrorSummaryItems,
  prepareEntry,
  prepareEntryIssueDetailsTemplateParams,
  getIssueDetails
  // logPageError
]
