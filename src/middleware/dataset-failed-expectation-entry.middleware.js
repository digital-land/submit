/**
 * @module middleware-dataset-failed-expectation-entry
 *
 * @description Responsible for displaying table of entities for a failed expectation for a dataset.
 *
 * See https://datasette.planning.data.gov.uk/digital-land/expectation for data.
 */

import * as v from 'valibot'
import {
  validateOrgAndDatasetQueryParams,
  expectationFetcher,
  expectations,
  validateQueryParams,
  fetchDatasetInfo,
  fetchOrgInfo,
  processSpecificationMiddlewares,
  getIssueSpecification,
  show404IfPageNumberNotInRange
} from './common.middleware.js'
import { entityOutOfBoundsMessage } from './datasetTaskList.middleware.js'
import { MiddlewareError } from '../utils/errors.js'
import { fetchMany, FetchOptions } from './middleware.builders.js'
import { createPaginationTemplateParamsObject } from '../utils/pagination.js'
import { getIssueTable, prepareTableParams } from './issueTable.middleware.js'
import { prepareEntityForTable, safeParse } from '../utils/entities.js'

export const ExpectationPathParams = v.union(Object.values(expectations).map(exp => v.literal(exp.slug)))

const CONSTANTS = {
  /**
     * Max number of records to include per query
     */
  entityQueryLimit: 50
}

const subPath = (organisation, dataset) => {
  return `/organisations/${organisation.organisation}/${dataset.dataset}/expectation/out-of-bounds`
}

export const validateExpectationParams = validateQueryParams({
  schema: v.object({
    expectation: ExpectationPathParams,
    pageNumber: v.optional(v.pipe(v.string(), v.transform(s => parseInt(s, 10)), v.minValue(1)), '1')
  })
})

const fetchOutOfBoundsExpectations = expectationFetcher({
  expectation: expectations.entitiesOutOfBounds,
  includeDetails: true,
  result: 'expectationOutOfBounds'
})

/**
 * @param {Object} req request object
 * @param {number[]} req.entityIds
 * @param {Object} res response object
 * @param {Function} next
 * @function
 */
const fetchEntities = fetchMany({
  query: ({ req }) => {
    const { entityIds, entityQueryLimit = CONSTANTS.entityQueryLimit } = req
    const { pageNumber } = req.parsedParams
    const entityQueryOffset = pageNumber - 1
    const start = entityQueryOffset * entityQueryLimit
    const ids = entityIds.slice(start, start + entityQueryLimit)
    return /* sql */ `
        select *
        from entity
        where entity in (${ids.map(id => ` ${id}`).join(', ')})
        order by entity asc
        limit ${entityQueryLimit}`
  },
  dataset: FetchOptions.fromParams,
  result: 'entities'
})

/**
 * Validates the expectations actually exist, 404 otherwise.
 *
 * @param {Object} req request object
 * @param {Object[]} req.expectationOutOfBounds array of expectation records
 * @param {*} res response object
 * @param {*} next
 */
export const validateExpectationsFailed = (req, res, next) => {
  if (req.expectationOutOfBounds.length === 0) {
    next(new MiddlewareError('expectation query for out of bounds entities returned no results)', 404))
  } else {
    next()
  }
}

export const deserialiseEntityIds = (req, res, next) => {
  const { expectationOutOfBounds } = req
  req.entityIds = safeParse(expectationOutOfBounds[0].details)?.entities
  req.entityIds?.sort()
  next()
}

const deserialiseEntities = (req, res, next) => {
  const { entities } = req
  req.issueEntities = entities.map(prepareEntityForTable)

  next()
}

const preparePaginationInfo = (req, res, next) => {
  const { orgInfo: organisation, dataset, entityIds = [], entityQueryLimit = CONSTANTS.entityQueryLimit } = req
  const { pageNumber } = req.parsedParams

  req.dataRange = {
    minRow: 0,
    maxRow: CONSTANTS.entityQueryLimit,
    totalRows: entityIds.length,
    maxPageNumber: Math.ceil(entityIds.length / entityQueryLimit),
    pageLength: entityQueryLimit,
    offset: pageNumber - 1 // page numbers start with 1
  }

  // subpath for the table of entities, each row's 'Referece' will link to an `.../entity` page
  const baseSubpath = subPath(organisation, dataset) + '/entity'
  req.pagination = createPaginationTemplateParamsObject({ pageNumber, baseSubpath, dataRange: req.dataRange })

  next()
}

const setTableParamsInfo = (req, res, next) => {
  const { orgInfo: organisation, dataset } = req
  // subpath for entities, the '/entity' suffix will be added by `prepareTableParams`
  req.baseSubpath = subPath(organisation, dataset)
  // our entities come from expectation record's JSON blob, we want all of them
  req.rowFilter = _ => true
  next()
}

/**
 *
 * @param {Object} req The request object. It should contain the following properties:
 * @param {Object} req.parsedParams An object containing the parameters of the request
 * @param {Object} req.orgInfo org info
 * @param {Object} req.dataset dataset info
 * @param {Object} [req.issueSpecification] specification
 * @param {Object[]} [req.expectationOutOfBounds]
 * @param {string} req.expectationOutOfBounds[].dataset
 * @param {boolean} req.expectationOutOfBounds[].passed did the exepectation pass
 * @param {number} req.expectationOutOfBounds[].expected
 * @param {number} req.expectationOutOfBounds[].actual
 * @param {String} req.expectationOutOfBounds[].details JSON string
 * @param {String[]} [req.entityIds] ids of entities out of bounds
 * @param {Object} req.tableParams table template parameters
 * @param {Object} req.dataRange
 * @param {Object} req.pagination pagination info
 * @param {Object} req.templateParams OUT value
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {undefined}
 */
const prepareTemplateParams = (req, res, next) => {
  const { orgInfo: organisation, dataset, issueSpecification, expectationOutOfBounds, tableParams, dataRange, pagination } = req

  req.templateParams = {
    organisation,
    dataset,
    errorSummary: {
      items: [
        { html: entityOutOfBoundsMessage(dataset.dataset, expectationOutOfBounds[0].actual), href: '' }
      ]
    },
    // we're hijacking isssueType here
    issueType: 'expectation',
    issueSpecification,
    tableParams,
    dataRange,
    pagination
  }

  next()
}

export default [
  validateOrgAndDatasetQueryParams,
  validateExpectationParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchOutOfBoundsExpectations,
  validateExpectationsFailed,
  deserialiseEntityIds,
  fetchEntities,
  deserialiseEntities,
  ...processSpecificationMiddlewares,
  getIssueSpecification,
  preparePaginationInfo,
  show404IfPageNumberNotInRange,
  setTableParamsInfo,
  prepareTableParams,
  prepareTemplateParams,
  getIssueTable
]
