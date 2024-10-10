import performanceDbApi from '../services/performanceDbApi.js'
import logger from '../utils/logger.js'
import { pagination } from '../utils/pagination.js'
import { fetchDatasetInfo, fetchEntityCount, fetchIssueEntitiesCount, fetchIssues, fetchLatestResource, fetchOrgInfo, fetchSpecification, formatErrorSummaryParams, isResourceIdNotInParams, logPageError, pullOutDatasetSpecification, reformatIssuesToBeByEntryNumber, takeResourceIdFromParams, validateQueryParams } from './common.middleware.js'
import { fetchIf, fetchMany, FetchOptions, parallel, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

const paginationPageLength = 50

export const IssueTableQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  issue_field: v.string(),
  pageNumber: v.optional(v.string()),
  resourceId: v.optional(v.string())
})

const validateIssueTableQueryParams = validateQueryParams.bind({
  schema: IssueTableQueryParams
})

export const setDefaultQueryParams = (req, res, next) => {
  if (!req.params.pageNumber) {
    req.params.pageNumber = 1
  }
  next()
}

const fetchEntitiesWithIssues = fetchMany({
  query: ({ req, params }) => {
    const pagination = {
      limit: paginationPageLength,
      offset: paginationPageLength * (params.pageNumber - 1)
    }
    return performanceDbApi.entitiesAndIssuesQuery({
      resource: req.resource.resource,
      issueType: req.params.issue_type,
      issueField: req.params.issue_field,
      pagination
    })
  },
  result: 'entitiesWithIssues',
  dataset: FetchOptions.fromParams
})

/**
 * Middleware function to prepare issue table template params
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Next function in the middleware chain
 */
export const prepareIssueTableTemplateParams = (req, res, next) => {
  const { issue_type: issueType, issue_field: issueField, lpa, dataset: datasetId } = req.params
  const { entitiesWithIssues, specification, pagination, errorSummary } = req

  const tableParams = {
    columns: specification.fields.map(field => field.field),
    fields: specification.fields.map(field => field.field),
    rows: entitiesWithIssues.map((entity, index) => {
      const columns = {}

      specification.fields.forEach(fieldObject => {
        const { field } = fieldObject
        if (field === 'reference') {
          const pageNumber = index + 1
          const entityLink = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/entry/${pageNumber}`
          columns[field] = { html: `<a href="${entityLink}">${entity[field]}</a>` }
        } else if (entity[field]) {
          columns[field] = { value: entity[field] }
        } else {
          columns[field] = { value: '' }
        }
      })

      let issues = {}
      try {
        issues = JSON.parse(entity.issues)
      } catch (e) {
        logger.warn('issueTableMiddleware:prepareIssueTableParams - entity issues is not valid json', { entityIssues: entity.issues })
      }

      Object.entries(issues).forEach(([field, issueType]) => {
        if (columns[field]) {
          columns[field].error = { message: issueType }
        } else {
          columns[field] = { value: '', error: { message: issueType } }
        }
      })

      return {
        columns
      }
    })
  }

  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
    errorSummary,
    issueType,
    tableParams,
    pagination
  }
  next()
}

/**
 * Creates pagination template parameters for the request.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function in the chain.
 *
 * @description
 * This middleware function extracts pagination-related parameters from the request,
 * calculates the total number of pages, and creates a pagination object that can be used
 * to render pagination links in the template.
 *
 * @returns {void}
 */
export const createPaginationTemplatePrams = (req, res, next) => {
  const { issueEntitiesCount } = req
  const { pageNumber, lpa, dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params

  const totalPages = Math.ceil(issueEntitiesCount / paginationPageLength)

  const BaseSubpath = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/`

  const paginationObj = {}
  if (pageNumber > 1) {
    paginationObj.previous = {
      href: `${BaseSubpath}${pageNumber - 1}`
    }
  }

  if (pageNumber < totalPages) {
    paginationObj.next = {
      href: `${BaseSubpath}${pageNumber + 1}`
    }
  }

  paginationObj.items = pagination(totalPages, pageNumber).map(item => {
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

  req.pagination = paginationObj

  next()
}

export const getIssueTable = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/issueTable.html',
  handlerName: 'getIssueTable'
})

export default [
  validateIssueTableQueryParams,
  setDefaultQueryParams,
  parallel([
    fetchOrgInfo,
    fetchDatasetInfo
  ]),
  fetchIf(isResourceIdNotInParams, fetchLatestResource, takeResourceIdFromParams),
  fetchEntitiesWithIssues,
  fetchIssueEntitiesCount,
  fetchSpecification,
  fetchIssues,
  reformatIssuesToBeByEntryNumber,
  pullOutDatasetSpecification,
  fetchEntityCount,
  formatErrorSummaryParams,
  createPaginationTemplatePrams,
  prepareIssueTableTemplateParams,
  getIssueTable,
  logPageError
]
