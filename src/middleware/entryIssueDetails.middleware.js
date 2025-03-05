import * as v from 'valibot'
import { createPaginationTemplateParams, fetchDatasetInfo, fetchEntryIssues, fetchOrgInfo, fetchResources, getErrorSummaryItems, getIssueSpecification, getSetBaseSubPath, getSetDataRange, logPageError, prepareIssueDetailsTemplateParams, processSpecificationMiddlewares, show404IfPageNumberNotInRange, validateQueryParams } from './common.middleware.js'
import { MiddlewareError } from '../utils/errors.js'
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
  query: ({ req, params }) => {
    if (!req.resources[0]) {
      return 'SELECT 0 AS count'
    }
    return `
      SELECT count(*) AS count
      FROM issue i
      LEFT JOIN issue_type it ON i.issue_type = it.issue_type
      WHERE resource = '${req.resources[0].resource}'
      AND i.issue_type = '${params.issue_type}'
      AND it.responsibility = 'external'
      AND field = '${params.issue_field}'
    `
  },
  result: 'issueCount'
})

export const setRecordCount = (req, res, next) => {
  req.recordCount = req?.issueCount?.count || 0
  next()
}

export const prepareEntry = (req, res, next) => {
  const { resources, entryIssues } = req

  if (!entryIssues || entryIssues.length === 0 || !resources || resources.length === 0) {
    const details = [
      `entryIssues: ${entryIssues ? 'present' : 'missing'}`,
      `entryIssues[0]: ${entryIssues[0] ? 'present' : 'missing'}`,
      `resources: ${resources ? 'present' : 'missing'}`
    ].join(', ')
    const error = new MiddlewareError(`Missing required values on request object: ${details}`, 404)
    return next(error)
  }

  const issue = entryIssues[0]

  if ((!issue.entry_number && !issue.entity && !issue.line_number) || !issue.issue_type || typeof issue.line_number !== 'number') {
    const error = new Error('Invalid entry issue structure')
    error.status = 500
    return next(error)
  }

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

const show404ifNoIssues = (req, res, next) => {
  if (req.recordCount === 0) {
    // e.g. we got here via old link and there are no issues anymore
    next(new MiddlewareError('Issue count is zero for dataset', 404))
  } else {
    next()
  }
}

export const getIssueDetails = renderTemplate({
  templateParams: (req) => ({
    ...req.templateParams,
    issueSpecification: req.issueSpecification
  }),
  template: 'organisations/issueDetails.html',
  handlerName: 'getIssueDetails'
})

export default [
  validateIssueDetailsQueryParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchResources,
  fetchResourceMetaData,
  ...processSpecificationMiddlewares,
  getIssueSpecification,
  addResourceMetaDataToResources,
  fetchIssueCount,
  setRecordCount,
  show404ifNoIssues,
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
