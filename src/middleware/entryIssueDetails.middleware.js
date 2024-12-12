import * as v from 'valibot'
import { createPaginationTemplateParams, fetchDatasetInfo, fetchEntryIssues, fetchOrgInfo, fetchResources, getErrorSummaryItems, getSetBaseSubPath, getSetDataRange, logPageError, prepareIssueDetailsTemplateParams, show404IfPageNumberNotInRange, validateQueryParams } from './common.middleware.js'
import { fetchMany, fetchOne, FetchOptions, renderTemplate } from './middleware.builders.js'
import { issueErrorMessageHtml } from '../utils/utils.js'

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

export const addResourceMetaDataToResources = (req, res, next) => {
  const { resources, resourceMetaData } = req

  req.resources = resources.map(resource => {
    const metaData = resourceMetaData.find(metaData => metaData.resource === resource.resource)
    if (metaData) {
      return { ...resource, ...metaData }
    }
    return resource
  })

  next()
}

const fetchIssueCount = fetchOne({
  query: ({ req, params }) => `
    select count(*) as count
    from issue i
    LEFT JOIN issue_type it ON i.issue_type = it.issue_type
    WHERE resource = '${req.resources[0].resource}'
    AND i.issue_type = '${params.issue_type}'
    AND it.responsibility = 'external'
    AND field = '${params.issue_field}'
  `,
  result: 'issueCount'
})

export const setRecordCount = (req, res, next) => {
  req.recordCount = req?.issueCount?.count || 0
  next()
}

export const prepareEntry = (req, res, next) => {
  const { resources, entryIssues } = req

  if (!entryIssues[0] || !resources) {
    const error = new Error('Missing required values on request object')
    error.status = 404
    return next(error)
  }

  const issue = entryIssues[0]

  const errorMessage = issue.message || issue.issue_type

  req.entry = {
    title: `entry: ${issue.entry_number}`,
    fields: [
      {
        key: {
          text: 'Endpoint URL'
        },
        value: {
          html: `<a href='${resources[0].endpoint_url}'>${resources[0].endpoint_url}</a>`
        },
        classes: ''
      },
      {
        key: {
          text: 'Row'
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
          html: issueErrorMessageHtml(errorMessage, issue)
        },
        classes: 'dl-summary-card-list__row--error govuk-form-group--error'
      }
    ]
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
  fetchIssueCount,
  setRecordCount,
  getSetDataRange(1),
  fetchEntryIssues,
  show404IfPageNumberNotInRange,
  getSetBaseSubPath(['entry']),
  createPaginationTemplateParams,
  getErrorSummaryItems,
  prepareEntry,
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]
