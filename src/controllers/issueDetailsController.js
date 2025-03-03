import * as v from 'valibot'
import PageController from './pageController.js'
import * as results from './resultsController.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { validateQueryParams } from '../middleware/common.middleware.js'
import { MiddlewareError } from '../utils/errors.js'
import { isFeatureEnabled } from '../utils/features.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

const validateParams = validateQueryParams({
  schema: v.object({
    pageNumber: v.optional(v.pipe(v.string(), v.transform(parseInt), v.minValue(1)), '1')
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
        format: 'html'
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

const middlewares = [
  isFeatureEnabled('checkIssueDetailsPage')
    ? validateParams
    : (req, res, next) => { return next(new MiddlewareError('Not found', 404)) },
  results.getRequestDataMiddleware,
  setDetailsOptions,
  results.fetchResponseDetails,
  results.checkForErroredResponse,
  results.setupTableParams,
  setPagination,
  results.getIssueTypesWithQualityCriteriaLevels,
  results.extractIssuesFromResults,
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
