import { MiddlewareError } from '../utils/errors.js'
import { issueErrorMessageHtml } from '../utils/utils.js'
import {
  fetchDatasetInfo,
  fetchOrgInfo,
  logPageError,
  validateQueryParams,
  createPaginationTemplateParams,
  show404IfPageNumberNotInRange,
  fetchResources,
  processRelevantIssuesMiddlewares,
  processEntitiesMiddlewares,
  processSpecificationMiddlewares,
  getSetBaseSubPath,
  getSetDataRange,
  getErrorSummaryItems,
  prepareIssueDetailsTemplateParams,
  filterOutEntitiesWithoutIssues,
  getIssueSpecification
} from './common.middleware.js'
import { renderTemplate } from './middleware.builders.js'
import * as v from 'valibot'

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

/**
 * @typedef {Object} SummaryItem
 * @property {Object} key
 * @property {string} key.text
 * @property {Object} value
 * @property {string} value.html
 * @property {string|undefined} value.originalValue
 * @property {string} classes
 */

/**
 * Returns a data in a format used by the `govukSummaryList` component.
 *
 * @param {*} text
 * @param {*} html
 * @param {*} classes
 * @returns {SummaryItem}
 */
export const getIssueField = (text, html, classes) => {
  classes = classes || ''
  return {
    key: {
      text
    },
    value: {
      html: html ? html.toString() : '',
      originalValue: html // we don't want any markup here
    },
    classes
  }
}

export const setRecordCount = (req, res, next) => {
  req.recordCount = req?.issueEntities?.length || 0
  next()
}

/**
 *  Updates `req` with `entry` object.
 *
 * - takes an issueEntity (based on current `pageNumber`)
 * - selects `issues` for that entity
 * - creates a map of field names to objects (in shape required by govuk component)
 * - decorates (with some HTML markup) data in those objects if the field has issues
 * - potentially extracts geometry from the entity
 *
 * @param {Object} req request object
 * @param {Object} res response object
 * @param {Function} next next function
 */
export function prepareEntity (req, res, next) {
  const { issueEntities, issues, specification } = req
  const { pageNumber, issue_type: issueType } = req.parsedParams

  if (!issueEntities || (issueEntities && issueEntities.length === 0)) {
    return next(new MiddlewareError('No issues for entity', 404))
  }

  const entityData = issueEntities[pageNumber - 1]
  const entityIssues = issues.filter(issue => issue.entity === entityData.entity)

  /** @type {Map<string, SummaryItem>} */
  const specFields = new Map()
  for (const { field, datasetField } of specification.fields) {
    const value = entityData[field] || entityData[datasetField]
    specFields.set(field, getIssueField(field, value))
  }

  entityIssues.forEach(issue => {
    const field = specFields.get(issue.field)
    if (field) {
      const message = issue.message || issue.type
      field.value.html = issueErrorMessageHtml(message, null) + field.value.html
      field.classes += 'dl-summary-card-list__row--error govuk-form-group--error'
    } else {
      const errorMessage = issue.message || issueType
      // TODO: pull the html out of here and into the template
      const valueHtml = issueErrorMessageHtml(errorMessage, issue.value)
      const classes = 'dl-summary-card-list__row--error govuk-form-group--error'
      const newField = getIssueField(issue.field, valueHtml, classes)
      newField.value.originalValue = issue.value
      specFields.set(issue.field, newField)
    }
  })

  const reference = specFields.get('reference')
  const geometries = []
  const pushGeometry = (key) => {
    const val = specFields.get(key)
    if (val) {
      geometries.push({
        type: key,
        geo: val.value.originalValue,
        reference: reference?.value?.html
      })
    }
  }
  pushGeometry('geometry')
  pushGeometry('point')

  req.entry = {
    title: entityData.name || `entity: ${entityData.entity}`,
    fields: [...specFields.values()],
    geometries
  }

  next()
}

/**
 *
 * @param {Object} req request
 * @param {number} req.recordCount
 * @param {Object} res response
 * @param {Function} next next function
 * @returns {undefined}
 */
export const show404ifNoIssues = (req, res, next) => {
  const { recordCount } = req
  if (recordCount === 0) {
    // possibly accessing an outdated URL
    return next(new MiddlewareError('no issues found', 404))
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

export default [
  validateIssueDetailsQueryParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchResources,
  ...processEntitiesMiddlewares,
  ...processRelevantIssuesMiddlewares,
  ...processSpecificationMiddlewares,
  getIssueSpecification,
  filterOutEntitiesWithoutIssues,
  setRecordCount,
  show404ifNoIssues,
  getSetDataRange(1),
  show404IfPageNumberNotInRange,
  getSetBaseSubPath(['entity']),
  createPaginationTemplateParams,
  getErrorSummaryItems,
  prepareEntity,
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]
