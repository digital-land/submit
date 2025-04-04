/**
 * @module middleware-dataset-failed-expectation-details
 *
 * @description Responsible for displaying issue page for a failed expectation of a dataset.
 *
 * See https://datasette.planning.data.gov.uk/digital-land/expectation for data.
 */

import {
  validateOrgAndDatasetQueryParams,
  expectationFetcher,
  expectations,
  fetchDatasetInfo,
  fetchOrgInfo
} from './common.middleware.js'
import { getIssueDetails } from './entityIssueDetails.middleware.js'
import { entityOutOfBoundsMessage } from './datasetTaskList.middleware.js'
import { fetchOne, FetchOptions } from './middleware.builders.js'
import { createPaginationTemplateParamsObject } from '../utils/pagination.js'
import { deserialiseEntityIds, validateExpectationParams, validateExpectationsFailed } from './dataset-failed-expectation-entry.middleware.js'
import { prepareEntityForTable } from '../utils/entities.js'

const fetchOutOfBoundsExpectations = expectationFetcher({
  expectation: expectations.entitiesOutOfBounds,
  includeDetails: true,
  result: 'expectationOutOfBounds'
})

const fetchEntity = fetchOne({
  query: ({ req }) => /* sql */ `select * --entity, name, geometry, point, entry_date
    from entity
    where entity = ${req.entityIds[req.parsedParams.pageNumber - 1]}`,
  dataset: FetchOptions.fromParams,
  result: 'entity'
})

const preparePaginationInfo = (req, res, next) => {
  const { orgInfo: organisation, dataset, entityIds = [] } = req
  const { pageNumber } = req.parsedParams

  req.dataRange = {
    minRow: 1,
    maxRow: 1,
    totalRows: 1,
    maxPageNumber: entityIds.length,
    pageLength: 1,
    offset: 0
  }

  const baseSubpath = `/organisations/${organisation.organisation}/${dataset.dataset}/expectation/out-of-bounds/entity`
  req.pagination = createPaginationTemplateParamsObject({ pageNumber, baseSubpath, dataRange: req.dataRange })

  next()
}

/**
 *
 * @param {Object} req The request object. It should contain the following properties:
 * @param {Object} req.parsedParams An object containing the parameters of the request
 * @param {Object} req.dataset dataset info
 * @param {Object} req.orgInfo org info
 * @param {Object[]} [req.expectationOutOfBounds]
 * @param {string} req.expectationOutOfBounds[].dataset
 * @param {boolean} req.expectationOutOfBounds[].passed did the exepectation pass
 * @param {number} req.expectationOutOfBounds[].expected
 * @param {number} req.expectationOutOfBounds[].actual
 * @param {String} req.expectationOutOfBounds[].details JSON string
 * @param {String[]} [req.entityIds] ids of entities out of bounds
 * @param {Object} req.dataRange
 * @param {Object} req.pagination pagination info
 * @param {Object} [req.entity]
 * @param {Object} req.templateParams OUT value
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {undefined}
 */
const prepareTemplateParams = (req, res, next) => {
  const { orgInfo: organisation, dataset, expectationOutOfBounds, entity, dataRange, pagination } = req

  const entityAugmented = prepareEntityForTable(entity)

  req.templateParams = {
    organisation,
    dataset,
    errorSummary: {
      items: [
        { html: entityOutOfBoundsMessage(dataset.dataset, expectationOutOfBounds[0].actual), href: '' }
      ]
    },
    // we're hijacking isssueType & issueField here
    issueType: 'expectation',
    issueField: expectations.entitiesOutOfBounds.slug,
    entry: {
      title: `Entity: ${entity.entity}`,
      fields: Object.entries(entityAugmented).map(([k, v]) => {
        return {
          key: { text: k },
          value: { html: `${v}` },
          classes: ''
        }
      })
    },
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
  fetchEntity,
  preparePaginationInfo,
  prepareTemplateParams,
  getIssueDetails
]
