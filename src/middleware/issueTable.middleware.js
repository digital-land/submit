/*
  this middleware should get all entities for the organisation, with all of the most recent issues
  then filter out any of the issues that have been fixed
  the construct the table params
  then construct the template params
  then render the template
*/

import { fetchDatasetInfo, fetchOrgInfo, fetchResources, processEntitiesMiddlewares, processRelevantIssuesMiddlewares, processSpecificationMiddlewares, validateQueryParams } from './common.middleware.js'
import { renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

export const IssueTableQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  issue_field: v.string(),
  pageNumber: v.optional(v.pipe(v.string(), v.transform(parseInt), v.number(), v.integer(), v.minValue(1))),
  resourceId: v.optional(v.string())
})

const validateIssueTableQueryParams = validateQueryParams({
  schema: IssueTableQueryParams
})

export const prepareTableParams = (req, res, next) => {
  const { entities, issues, uniqueDatasetFields } = req
  const { lpa, dataset, issue_type: issueType, issue_field: issueField } = req.params

  const allRows = entities.map((entity, index) => ({
    columns: Object.fromEntries(uniqueDatasetFields.map((field) => {
      const errorMessage = issues.find(issue => issue.entity === entity.entity && issue.field === field)?.issue_type
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

  req.tableParams = {
    columns: uniqueDatasetFields,
    fields: uniqueDatasetFields,
    rows: rowsWithErrors
  }

  next()
}

export const prepareTemplateParams = (req, res, next) => {
  const { tableParams, orgInfo, dataset } = req
  const { issue_type: issueType } = req.params

  req.templateParams = {
    tableParams,

    organisation: orgInfo,
    dataset,
    errorHeading: 'ToDo',
    // issueItems,
    issueType
    // pagination: paginationObj,
    // issueEntitiesCount,
    // pageNumber
  }
  next()
}

export const getIssueTable = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/issueTable.html',
  handlerName: 'getIssueTable'
})

export default [
  validateIssueTableQueryParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchResources,
  ...processRelevantIssuesMiddlewares,
  ...processEntitiesMiddlewares,
  ...processSpecificationMiddlewares,
  prepareTableParams,
  prepareTemplateParams,
  getIssueTable
]
