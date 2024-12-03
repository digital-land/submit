import * as v from 'valibot'
import { createPaginationTemplateParams, fetchDatasetInfo, fetchOrgInfo, fetchResources, getErrorSummaryItems, getSetBaseSubPath, getSetDataRange, prepareIssueDetailsTemplateParams, show404IfPageNumberNotInRange, validateQueryParams } from './common.middleware.js'
import { fetchMany, FetchOptions, renderTemplate } from './middleware.builders.js'

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

// We can only get the issues without entity from the latest resource as we have no way of knowing if those in previous resources have been fixed?
const fetchEntryIssues = fetchMany({
  query: ({ req, params }) => `
    select * 
    from issue i
    LEFT JOIN issue_type it ON i.issue_type = it.issue_type
    WHERE resource = '${req.resources[0].resource}'
    AND i.issue_type = '${params.issue_type}'
    AND it.responsibility = 'external'
    AND field = '${params.issue_field}'
  `,
  result: 'issues'
})

export const setRecordCount = (req, res, next) => {
  req.recordCount = req?.issues?.length || 0
  next()
}

export const prepareEntry = (req, res, next) => {
  const { resources, issues } = req
  const { pageNumber } = req.parsedParams

  if (!issues[pageNumber - 1] || !resources) {
    const error = new Error('Missing required values on request object')
    error.status = 404
    return next(error)
  }

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
  setRecordCount,
  getSetDataRange(1),
  show404IfPageNumberNotInRange,
  getSetBaseSubPath(['entry']),
  createPaginationTemplateParams,
  getErrorSummaryItems,
  prepareEntry,
  prepareIssueDetailsTemplateParams,
  getIssueDetails
]
