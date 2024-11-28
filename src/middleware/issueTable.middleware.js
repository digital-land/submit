/*
  this middleware should get all entities for the organisation, with all of the most recent issues
  then filter out any of the issues that have been fixed
  the construct the table params
  then construct the template params
  then render the template
*/

import performanceDbApi from '../services/performanceDbApi.js'
import logger from '../utils/logger.js'
import { createPaginationTemplateParams, fetchDatasetInfo, fetchOrgInfo, fetchResources, processEntitiesMiddlewares, processRelevantIssuesMiddlewares, processSpecificationMiddlewares, show404IfPageNumberNotInRange, validateQueryParams } from './common.middleware.js'
import { onlyIf, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

export const IssueTableQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  issue_field: v.string(),
  pageNumber: v.optional(v.pipe(v.string(), v.transform(s => parseInt(s, 10)), v.number(), v.integer(), v.minValue(1)), '1'),
  resourceId: v.optional(v.string())
})

const validateIssueTableQueryParams = validateQueryParams({
  schema: IssueTableQueryParams
})

export const getDataRange = (req, res, next) => {
  const { issues } = req
  const { pageNumber } = req.parsedParams
  const pageLength = 50
  const recordCount = issues.length
  req.dataRange = {
    minRow: (pageNumber - 1) * pageLength,
    maxRow: Math.min((pageNumber - 1) * pageLength + pageLength, recordCount),
    totalRows: recordCount,
    maxPageNumber: Math.ceil(recordCount / pageLength),
    pageLength
  }
  next()
}

export const setBaseSubpath = (req, res, next) => {
  const { lpa, dataset, issue_type: issueType, issue_field: issueField } = req.params
  req.baseSubpath = `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(dataset)}/${encodeURIComponent(issueType)}/${encodeURIComponent(issueField)}`
  next()
}

export const prepareTableParams = (req, res, next) => {
  const { entities, issues, uniqueDatasetFields, dataRange } = req
  const { lpa, dataset, issue_type: issueType, issue_field: issueField } = req.params

  const allRows = entities.map((entity, index) => ({
    columns: Object.fromEntries(uniqueDatasetFields.map((field) => {
      const errorMessage = issues.find(issue => issue.entity === entity.entity && (issue.field === field || issue.replacement_field === field))?.issue_type
      if (field === 'reference') {
        return [field, {
          html: `<a href='/organisations/${lpa}/${dataset}/${issueType}/${issueField}/entry/${index + 1}'>${entity[field]}</a>`,
          error: errorMessage
            ? {
                message: errorMessage
              }
            : undefined
        }]
      } else {
        return [field, {
          value: entity[field],
          error: errorMessage
            ? {
                message: errorMessage
              }
            : undefined
        }]
      }
    }))
  }))

  const rowsWithErrors = allRows.filter(row => Object.values(row.columns).reduce((hasError, column) => {
    return column.error !== undefined || hasError
  }, false))

  const rowsPaginated = rowsWithErrors.slice(dataRange.minRow, dataRange.maxRow)

  req.tableParams = {
    columns: uniqueDatasetFields,
    fields: uniqueDatasetFields,
    rows: rowsPaginated
  }

  next()
}

export const getErrorSummaryItems = (req, res, next) => {
  const { issue_type: issueType, issue_field: issueField, baseSubpath } = req.params

  const { entities, issues } = req

  let errorHeading = ''
  let issueItems

  if (issues.length <= 0) {
    // currently the task list page is getting its issues incorrectly, not factoring in the fact that an issue might have been fixed.
    logger.warn(`issueTable was accessed from ${req.headers.referer} but there was no issues`)
    const error = new Error('issue count must be larger than 0')
    return next(error)
  } else if (issues.length < entities.length) {
    errorHeading = performanceDbApi.getTaskMessage({
      issue_type: issueType,
      num_issues: issues.length,
      entityCount: entities.length,
      field: issueField
    },
    true)
    issueItems = issues.map((issue, i) => {
      const pageNum = i + 1
      return {
        html: performanceDbApi.getTaskMessage({
          issue_type: issueType,
          num_issues: 1,
          field: issueField
        }) + ` in entity ${issue.entity}`,
        href: `${baseSubpath}/entity/${pageNum}`
      }
    })
  } else {
    issueItems = [{
      html: performanceDbApi.getTaskMessage({
        issue_type: issueType,
        num_issues: issues.length,
        entityCount: entities.length,
        field:
        issueField
      }, true)
    }]
  }

  req.errorSummary = {
    heading: errorHeading,
    items: issueItems
  }

  next()
}

export const prepareTemplateParams = (req, res, next) => {
  const { tableParams, orgInfo, dataset, errorSummary, pagination, dataRange } = req
  const { issue_type: issueType } = req.params

  req.templateParams = {
    tableParams,
    organisation: orgInfo,
    dataset,
    errorSummary,
    issueType,
    pagination,
    dataRange
    // issueEntitiesCount,
    // pageNumber
  }
  next()
}

export const notIssueHasEntity = (req, res, next) => req.issues.length <= 0

const redirectIssueGroups = [
  {
    type: 'missing value',
    field: 'reference'
  },
  {
    type: 'reference values are not unique',
    field: 'reference'
  },
  {
    type: 'unknown entity - missing reference',
    field: 'entity'
  }
]
export const issueTypeAndFieldShouldRedirect = (req, res, next) =>
  redirectIssueGroups.findIndex(({ type, field }) => (type === req.params.issue_type && field === req.params.issue_field)) >= 0

export const redirectToEntityView = (req, res, next) => {
  const { lpa, dataset, issue_type: issueType, issue_field: issueField } = req.params
  return res.redirect(`/organisations/${lpa}/${dataset}/${issueType}/${issueField}/entry`)
  // don't call next here to avoid rest of middleware chain running
}

export const getIssueTable = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/issueTable.html',
  handlerName: 'getIssueTable'
})

export default [
  onlyIf(issueTypeAndFieldShouldRedirect, redirectToEntityView),
  validateIssueTableQueryParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchResources,
  ...processRelevantIssuesMiddlewares,
  ...processEntitiesMiddlewares,
  ...processSpecificationMiddlewares,
  onlyIf(notIssueHasEntity, redirectToEntityView),
  getDataRange,
  show404IfPageNumberNotInRange,
  setBaseSubpath,
  getErrorSummaryItems,
  createPaginationTemplateParams,
  prepareTableParams,
  prepareTemplateParams,
  getIssueTable
]
