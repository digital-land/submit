import * as v from 'valibot'
import PageController from './pageController.js'
import * as results from './resultsController.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { validateQueryParams } from '../middleware/common.middleware.js'
import { MiddlewareError } from '../utils/errors.js'
import { isFeatureEnabled } from '../utils/features.js'
import { withAssociatedEntityDiagram } from '../utils/associatedEntityDiagrams.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { fetchOne } from '../middleware/middleware.builders.js'

const validateParams = validateQueryParams({
  schema: v.object({
    pageNumber: v.optional(v.pipe(v.string(), v.transform(s => parseInt(s, 10)), v.number(), v.integer(), v.minValue(1)), '1')
  })
})

/**
 * Middleware. Updates req.locals with `task`, `field` and `issueType`
 *
 * @param {Object} req - Express request object with aggregatedTasks
 * @param {Map<string, Object>} req.aggregatedTasks - Map of tasks
 * @param {string} req.aggregatedTasks.*.field - Field name
 * @param {string} req.aggregatedTasks.*.issueType - Issue type
 * @param {number} req.aggregatedTasks.*.count - Issue count
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export const prepareTask = (req, res, next) => {
  const { issueType: issueTypeSlug, field } = req.params
  const dataset = req.sessionModel?.get('data-subject')
  const task = req.aggregatedTasks.get(`${issueTypeSlug}|${field}`)
  if (!task) {
    return next(new MiddlewareError(`No isssue of type '${issueTypeSlug}' for field ${field}`, 404))
  }

  let message = issueTypeSlug // fallback
  if (issueTypeSlug === 'missing column') {
    message = results.missingColumnTaskMessage(`<span class="column-name">${task.field}</span>`)
  } else {
    try {
      message = performanceDbApi.getTaskMessage({
        issue_type: task.issueType,
        num_issues: task.count,
        rowCount: req.totalRows,
        field: task.field,
        format: 'html',
        dataset
      })
    } catch (error) {
      logger.warn('prepareTask/getTaskMessage failure', { type: types.App, errorMessage: error.message, errorStack: error.stack })
    }
  }

  req.locals.issueType = issueTypeSlug
  req.locals.field = field
  req.locals.task = { ...task, message }
  next()
}

/**
 */
const setPagination = (req, res, next) => {
  const { id, issueType, field } = req.params
  /** @type { {responseDetails: import('../models/responseDetails.js').default} } */
  const { responseDetails } = req.locals
  const pagination = responseDetails.getPagination(req.parsedParams.pageNumber, {
    href: (item) => `/check/results/${id}/issue/${issueType}/${field}/${item}`
  })
  req.locals.pagination = pagination
  next()
}

async function setDetailsOptions (req, res, next) {
  req.locals.detailsOptions = { issue: { ...req.params } }
  next()
}

/**
 * Get the specification identifier for a dataset or subject.
 *
 * local-plan data uses the shared plan specification.
 *
 * @param {string} datasetOrSubject - Dataset or subject from the check request.
 * @returns {string} Specification identifier.
 */
function getSpecificationSubject (datasetOrSubject) {
  return datasetOrSubject === 'local-plan' ? 'plan' : datasetOrSubject
}

const fetchSpecification = fetchOne({
  query: () => 'SELECT * FROM specification WHERE specification = :specification',
  queryParams: ({ req }) => ({
    specification: getSpecificationSubject(req.datasetDetails.collection)
  }),
  result: 'specification'
})

const fetchDatasetInfo = fetchOne({
  query: () => 'SELECT name, dataset, collection FROM dataset WHERE dataset = :dataset',
  queryParams: ({ req }) => ({ dataset: req.sessionModel.get('dataset') }),
  result: 'datasetDetails'
})

async function getIssueSpecification (req, res, next) {
  const {
    specification,
    datasetDetails,
    params: {
      field: issueField
    }
  } = req

  if (!specification) return next()

  const datasetSpecification = JSON.parse(specification.json)
    .find((spec) => spec.dataset === getSpecificationSubject(datasetDetails.dataset))
  const fieldSpecification = datasetSpecification?.fields?.find(f => f.field === issueField)

  if (!fieldSpecification) return next()

  req.locals.issueSpecification = withAssociatedEntityDiagram(fieldSpecification, dataset)
  req.locals.datasetDetails = datasetDetails

  next()
}

const middlewares = [
  isFeatureEnabled('checkIssueDetailsPage')
    ? validateParams
    : (req, res, next) => { return next(new MiddlewareError('Not found', 404)) },
  results.getRequestDataMiddleware,
  results.updateSessionFromRequestData,
  setDetailsOptions,
  fetchDatasetInfo,
  fetchSpecification,
  getIssueSpecification,
  results.fetchResponseDetails,
  results.checkForErroredResponse,
  results.setupTableParams,
  setPagination,
  results.getIssueTypesWithQualityCriteriaLevels,
  results.extractIssuesFromTaskLog,
  results.addQualityCriteriaLevelsToIssues,
  results.aggregateIssues,
  results.getBlockingTasks, // we get this to ensure 'missing column issues
  results.getTotalRows,
  prepareTask,
  results.setupError
]

export default class IssueDetailsController extends PageController {
  middlewareSetup () {
    super.middlewareSetup()
    for (const middleware of middlewares) {
      this.use(middleware)
    }
  }

  async locals (req, res, next) {
    try {
      Object.assign(req.form.options, req.locals)
      super.locals(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
