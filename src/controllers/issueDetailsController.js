import PageController from './pageController.js'
import * as results from './resultsController.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { MiddlewareError } from '../utils/errors.js'
import { isFeatureEnabled } from '../utils/features.js'

/**
 * Middleware. Updates req with `task`
 *
 * @param {*} req request
 * @param {*} res response
 * @param {*} next next function
 */
export const prepareTask = (req, res, next) => {
  const { issueType, field } = req.params

  const task = req.aggreatedTasks.get(`${issueType}|${field}`)
  if (!task) {
    return next(new MiddlewareError(`No isssue of type '${issueType}' for field ${field}`, 404))
  }

  const message = performanceDbApi.getTaskMessage({
    issue_type: task.issueType,
    num_issues: task.count,
    rowCount: req.totalRows,
    field: task.field,
    format: 'html'
  })
  req.locals.task = { ...task, message }
  next()
}

const middlewares = [
  isFeatureEnabled('checkIssueDetailsPage')
    ? results.getRequestDataMiddleware
    : (req, res, next) => { return next(new MiddlewareError('Not found', 404)) },
  results.getRequestDataMiddleware,
  results.fetchResponseDetails,
  results.checkForErroredResponse,
  results.setupTableParams,
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
