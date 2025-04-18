/**
 * @module middleware-issue-table
 *
 * @description
 * This middleware should get all entities for the organisation, with all of the most recent issues
 * then filter out any of the issues that have been fixed
 * the construct the table params
 * then construct the template params
 * then render the template
 */

import config from '../../config/index.js'
import { createPaginationTemplateParams, fetchDatasetInfo, fetchOrgInfo, fetchResources, filterOutEntitiesWithoutIssues, getErrorSummaryItems, getIssueSpecification, getSetBaseSubPath, getSetDataRange, logPageError, processEntitiesMiddlewares, processRelevantIssuesMiddlewares, processSpecificationMiddlewares, show404IfPageNumberNotInRange, validateQueryParams } from './common.middleware.js'
import { onlyIf, renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'
import { entryIssueGroups } from '../utils/utils.js'
import { splitByLeading } from '../utils/table.js'

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

export const setRecordCount = (req, res, next) => {
  req.recordCount = req?.issues?.length || 0
  next()
}

const rowErrorReducer = (hasError, column) => {
  return column.error !== undefined || hasError
}

const rowHasError = (row) => {
  return Object.values(row.columns).reduce(rowErrorReducer, false)
}

/**
 *
 * @param {Object} req request object
 * @param {Object[]} [req.issues] issues
 * @param {function(any): boolean} [req.rowFilter] predicate taking a single row
 * @param {Object[]} req.issueEntities entities
 * @param {string[]} req.uniqueDatasetFields
 * @param {Object} req.dataRange conforming to `src/routes/schemasjs:dataRangeParams`.
 * @param {string} req.baseSubpath URL path prefix
 * @param {Object} req.tableParams OUT value
 * @param {*} res response object
 * @param {*} next
 */
export const prepareTableParams = (req, res, next) => {
  const { issueEntities, issues = [], uniqueDatasetFields, dataRange, baseSubpath, rowFilter = rowHasError } = req
  const { leading, trailing } = splitByLeading({ fields: uniqueDatasetFields })
  const orderedFields = leading.concat(trailing)

  const allRows = issueEntities.map((entity, index) => ({
    columns: Object.fromEntries(orderedFields.map((field) => {
      const errorMessage = issues.find(issue => issue.entity === entity.entity && (issue.field === field || issue.replacement_field === field))?.issue_type
      if (field === 'reference') {
        return [field, {
          html: `<a href='${baseSubpath}/entity/${index + 1}'>${entity[field]}</a>`,
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

  const rowsWithErrors = allRows.filter(rowFilter)
  const rowsPaginated = rowsWithErrors.slice(dataRange.minRow, dataRange.maxRow)

  req.tableParams = {
    columns: orderedFields,
    fields: orderedFields,
    rows: rowsPaginated
  }

  next()
}

/**
 *
 * @param {Object[]} rows issue rows
 * @param {Object} rows.columns
 * @returns {Object[]}
 */
function geometryProps (rows) {
  const geometries = []
  for (const { columns } of rows) {
    if ('point' in columns) {
      geometries.push({ geo: columns.point.value, reference: columns.reference.html, type: 'point' })
    }
    if ('geometry' in columns) {
      geometries.push({ geo: columns.geometry.value, reference: columns.reference.html, type: 'geometry' })
    }
  }
  return geometries
}

export const prepareTemplateParams = (req, res, next) => {
  const { tableParams, orgInfo, dataset, errorSummary, pagination, dataRange, issueSpecification } = req
  const { issue_type: issueType } = req.params

  const geometries = geometryProps(tableParams.rows)

  req.templateParams = {
    tableParams,
    organisation: orgInfo,
    dataset,
    errorSummary,
    issueType,
    pagination,
    dataRange,
    issueSpecification,
    geometries
  }
  next()
}

export const notIssueHasEntity = (req, res, next) => req.issues.length <= 0

export const issueTypeAndFieldShouldRedirect = (req, res, next) =>
  entryIssueGroups.findIndex(({ type, field }) => (type === req.params.issue_type && field === req.params.issue_field)) >= 0

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
  ...processEntitiesMiddlewares,
  ...processRelevantIssuesMiddlewares,
  ...processSpecificationMiddlewares,
  onlyIf(notIssueHasEntity, redirectToEntityView),
  filterOutEntitiesWithoutIssues,
  setRecordCount,
  getSetDataRange(config.tablePageLength),
  show404IfPageNumberNotInRange,
  getSetBaseSubPath(),
  getErrorSummaryItems,
  getIssueSpecification,
  createPaginationTemplateParams,
  prepareTableParams,
  prepareTemplateParams,
  getIssueTable,
  logPageError
]
