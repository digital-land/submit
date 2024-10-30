/*
  this middleware should get all entities for the organisation, with all of the most recent issues
  then filter out any of the issues that have been fixed
  the construct the table params
  then construct the template params
  then render the template
*/

import datasette from '../services/datasette.js'
import { addDatabaseFieldToSpecification, extractJsonFieldFromEntities, fetchDatasetInfo, fetchOrgInfo, pullOutDatasetSpecification, replaceUnderscoreInEntities, replaceUnderscoreInSpecification, validateQueryParams } from './common.middleware.js'
import { fetchFieldMappings, fetchSpecification, getUniqueDatasetFieldsFromSpecification } from './dataview.middleware.js'
import { fetchMany, FetchOptions, renderTemplate } from './middleware.builders.js'
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

const fetchEntities = fetchMany({
  query: ({ req }) => `
    SELECT * FROM entity e
    WHERE e.organisation_entity = ${req.orgInfo.entity}`,
  dataset: FetchOptions.fromParams,
  result: 'entities'
})

const fetchEntityIssues = fetchMany({
  query: ({ req }) => `
    SELECT e.entity, i.* FROM entity e
    INNER JOIN issue i ON e.entity = i.entity
    WHERE e.organisation_entity = ${req.orgInfo.entity}`,
  dataset: FetchOptions.fromParams,
  result: 'issues'
})

const fetchResources = fetchMany({
  query: ({ req }) => `
    select * from resource r
    LEFT JOIN resource_organisation ro ON ro.resource = r.resource
    LEFT JOIN resource_dataset rd ON rd.resource = r.resource
    WHERE ro.organisation = 'local-authority:LBH'
    AND rd.dataset = 'brownfield-land'
    AND r.end_date = ''
    ORDER BY start_date desc`,
  result: 'resources'
})

const FilterOutIssuesToRelevant = (req, res, next) => {
  const { resources, issues } = req

  const groupedIssues = issues.reduce((acc, current) => {
    current.start_date = resources.find(resource => resource.resource === current.resource)?.start_date
    const { entity, field } = current
    if (!acc[entity]) {
      acc[entity] = {}
    }
    if (!acc[entity][field]) {
      acc[entity][field] = []
    }
    acc[entity][field].push(current)

    return acc
  }, {})

  const recentIssues = Object.fromEntries(Object.entries(groupedIssues).map(([entityName, issuesByEntity]) =>
    [
      entityName,
      Object.fromEntries(Object.entries(issuesByEntity).map(([field, issues]) =>
        [
          field,
          issues.sort((a, b) => a.start_date > b.start_date)[0]
        ]
      ))
    ]
  ))

  const issuesFlattened = []

  Object.values(recentIssues).forEach(issueByEntry => {
    Object.values(issueByEntry).forEach(issueByField => {
      issuesFlattened.push(issueByField)
    })
  })

  req.issues = issuesFlattened
  next()
}

// the problem with this is it assumes the entity contains the most recent fact
export const removeIssuesThatHaveBeenFixed = async (req, res, next) => {
  const { issues, resources } = req

  // get all more recent facts for each issue
  const promises = issues
    .filter(issue => issue.resource !== resources[0].resource)
    .map((issue) => {
      const resourceIndex = resources.findIndex(resource => resource.resource === issue.resource)
      const newerResources = resourceIndex >= 0 ? resources.slice(0, resourceIndex) : resources

      return datasette.runQuery(`
        SELECT * FROM fact f
        LEFT JOIN fact_resource fr ON f.fact = fr.fact
        WHERE entity = ${issue.entity}
        AND field = '${issue.field}'
        AND fr.resource IN ('${newerResources.map(resource => resource.resource).join("','")}')`,
      issue.dataset
      )
    })

  Promise.allSettled(promises).then((results) => {
    // results is an array of objects with status (fulfilled or rejected) and value or reason
    results.forEach(result => {
      if (result.value.formattedData.length > 0) {
        req.issues = issues.filter(issue => issue.entity !== result.value.formattedData.entity && issue.field !== result.value.formattedData.field)
      }
    })

    next()
  })

  // req.issues = Object.fromEntries(Object.entries(issues).map(([entityNumber, issueByEntity]) => {
  //   return [
  //     entityNumber,
  //     Object.fromEntries(Object.entries(issueByEntity).filter(([field, issue]) => {
  //       const issueEntity = entities.find(entity => entity.entity === parseInt(entityNumber))
  //       if (!issueEntity) {
  //         return false
  //       }
  //       let currentValue = issueEntity[field]
  //       currentValue = currentValue || ''
  //       return issue.value === currentValue
  //     }))
  //   ]
  // }))

  // next()
}

export const prepareTableParams = (req, res, next) => {
  const { entities, issues, uniqueDatasetFields } = req

  const allRows = entities.map(entity => ({
    columns: Object.fromEntries(uniqueDatasetFields.map((field) => {
      const errorMessage = issues.find(issue => issue.entity === entity.entity && issue.field === field)?.issue_type
      return [field, {
        value: entity[field],
        error: errorMessage
          ? {
              message: errorMessage
            }
          : undefined
      }]
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
  const { tableParams } = req

  req.templateParams = {
    tableParams
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
  fetchEntityIssues,
  fetchResources,
  FilterOutIssuesToRelevant,

  fetchEntities,
  extractJsonFieldFromEntities,
  replaceUnderscoreInEntities,

  fetchSpecification,
  pullOutDatasetSpecification,
  replaceUnderscoreInSpecification,

  fetchFieldMappings,
  addDatabaseFieldToSpecification,
  getUniqueDatasetFieldsFromSpecification,

  removeIssuesThatHaveBeenFixed,

  prepareTableParams,
  prepareTemplateParams,
  getIssueTable
]
