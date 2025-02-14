import * as v from 'valibot'
import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import prettifyColumnName from '../filters/prettifyColumnName.js'
import { fetchMany } from '../middleware/middleware.builders.js'
import { validateQueryParams } from '../middleware/common.middleware.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { isFeatureEnabled } from '../utils/features.js'

const isIssueDetailsPageEnabled = isFeatureEnabled('checkIssueDetailsPage')

const failedFileRequestTemplate = 'results/failedFileRequest'
const failedUrlRequestTemplate = 'results/failedUrlRequest'
const resultsTemplate = 'results/results'

class ResultsController extends PageController {
  /* Custom middleware */
  middlewareSetup () {
    super.middlewareSetup()
    this.use(validateParams)
    this.use(getRequestDataMiddleware)
    this.use(setupTemplate)
    this.use(fetchResponseDetails)
    this.use(checkForErroredResponse)
    this.use(setupTableParams)
    this.use(getIssueTypesWithQualityCriteriaLevels)
    this.use(extractIssuesFromResults)
    this.use(addQualityCriteriaLevelsToIssues)
    this.use(aggregateIssues)
    this.use(getTotalRows)
    this.use(getBlockingTasks)
    this.use(getNonBlockingTasks)
    this.use(getPassedChecks)
    this.use(setupError)
  }

  async locals (req, res, next) {
    try {
      Object.assign(req.form.options, req.locals)
      super.locals(req, res, next)
    } catch (error) {
      next(error)
    }
  }

  noErrors (req, res, next) {
    return !req.form.options.data.hasErrors()
  }
}

export async function getRequestDataMiddleware (req, res, next) {
  try {
    req.locals = {
      requestData: await getRequestData(req.params.id)
    }
    if (!req.locals.requestData.isComplete()) {
      res.redirect(`/check/status/${req.params.id}`)
      return
    }
    next()
  } catch (error) {
    next(error)
  }
}

export async function checkForErroredResponse (req, res, next) {
  if (req.locals.requestData.response.error) {
    return next(new Error(req.locals.requestData.response.error.message))
  }
  next()
}

export function setupTemplate (req, res, next) {
  try {
    if (req.locals.requestData.isFailed()) {
      if (req.locals.requestData.getType() === 'check_file') {
        req.locals.template = failedFileRequestTemplate
      } else {
        req.locals.template = failedUrlRequestTemplate
      }
    } else {
      req.locals.template = resultsTemplate
    }
    req.locals.requestParams = req.locals.requestData.getParams()
    next()
  } catch (e) {
    next(e)
  }
}

export async function fetchResponseDetails (req, res, next) {
  const { pageNumber } = req.parsedParams
  try {
    if (req.locals.template !== failedFileRequestTemplate && req.locals.template !== failedUrlRequestTemplate) {
      const responseDetails = req.locals.template === resultsTemplate
        // pageNumber starts with: 1, fetchResponseDetails parameter `pageOffset` starts with 0
        ? await req.locals.requestData.fetchResponseDetails(pageNumber - 1, 50, 'error')
        : await req.locals.requestData.fetchResponseDetails(pageNumber - 1)
      req.locals.responseDetails = responseDetails
    }
  } catch (e) {
    next(e)
    return
  }
  next()
}

export function setupTableParams (req, res, next) {
  if (req.locals.template !== failedFileRequestTemplate && req.locals.template !== failedUrlRequestTemplate) {
    const responseDetails = req.locals.responseDetails
    let rows = responseDetails.getRowsWithVerboseColumns(req.locals.requestData.hasErrors())

    // remove any issues that aren't of severity error
    rows = rows.map((row) => {
      const { columns, ...rest } = row

      const columnsOnlyErrors = Object.fromEntries(Object.entries(columns).map(([key, value]) => {
        let error
        if (value.error && value.error.severity === 'error') {
          error = value.error
        }
        const newValue = {
          ...value,
          error
        }
        return [key, newValue]
      }))

      return {
        ...rest,
        columns: columnsOnlyErrors
      }
    })

    req.locals.tableParams = {
      columns: responseDetails.getColumns().map(column => prettifyColumnName(column)),
      rows,
      fields: responseDetails.getFields()
    }

    req.locals.mappings = responseDetails.getFieldMappings()
    req.locals.geometries = responseDetails.getGeometries()
    // pagination is on the 'table' tab, so we want to ensure clicking those
    // links takes us to a page with the table tab *selected*
    const pageNumer = Number.parseInt(req.params.pageNumber)
    const pagination = responseDetails.getPagination(pageNumer, { hash: '#table-tab' })
    req.locals.pagination = pagination
    req.locals.id = req.params.id
    req.locals.lastPage = `/check/status/${req.params.id}`
  }
  next()
}

export function setupError (req, res, next) {
  try {
    if (req.locals.template === failedFileRequestTemplate || req.locals.template === failedUrlRequestTemplate) {
      req.locals.error = req.locals.requestData.getError()
    }
    next()
  } catch (error) {
    next(error)
  }
}

export const getIssueTypesWithQualityCriteriaLevels = fetchMany({
  query: ({ req }) => 'select description, issue_type, name, severity, responsibility, quality_dimension, quality_criteria, quality_criteria_level from issue_type',
  result: 'issueTypes'
})

export function extractIssuesFromResults (req, res, next) {
  const { responseDetails } = req.locals

  const issueLogsByRow = responseDetails.response.map(row => row.issue_logs)
  const issues = issueLogsByRow.flat()

  req.issues = issues

  next()
}

export function addQualityCriteriaLevelsToIssues (req, res, next) {
  const { issues, issueTypes } = req
  const issueTypeMap = new Map(issueTypes.map(it => [it.issue_type, it]))

  req.issues = issues.map(issue => {
    const issueType = issueTypeMap.get(issue['issue-type'])
    return {
      ...issue,
      quality_criteria_level: issueType ? issueType.quality_criteria_level : null
    }
  })

  next()
}

/**
 * Aggregate issues by issue_type into tasks
 *
 * Updates req with `aggregatedTasks: Map<string, task>` (keys are composites of issue type and field),
 * and `tasks` array.
 *
 * @param {*} req request
 * @param {*} res response
 * @param {*} next next function
 */
export function aggregateIssues (req, res, next) {
  const { issues } = req

  const taskMap = new Map()
  for (const issue of issues) {
    if (filterOutTasksByQualityCriterialLevel(issue)) {
      const key = `${issue['issue-type']}|${issue.field}`
      const task = taskMap.get(key)
      if (!task) {
        taskMap.set(key, {
          issueType: issue['issue-type'],
          field: issue.field,
          qualityCriteriaLevel: issue.quality_criteria_level,
          count: 1
        })
      } else {
        task.count++
      }
    }
  }

  req.aggreatedTasks = taskMap
  req.tasks = Array.from(taskMap.values())

  next()
}

/*
  Implementation detail:
  the quality level is used to determine the severity of the issue.
  Issues labeled as quality_level 2 are considered 'blocking'.
  Issues labeled as quality_level 3 are considered 'non-blocking'.
  Issues without a quality_level are excluded from the results, as these either have responsibility set to internal or severity of warning.
*/
export function filterOutTasksByQualityCriterialLevel (issue) {
  return [2, 3].includes(issue.quality_criteria_level)
}

/**
 * @typedef {{text: string, link: boolean, colour: string }} Status
 *
 * @type {{mustFix: Status, shouldFix: Status, passed: Status }}
 */
const taskStatus = {
  mustFix: { text: 'Must fix', link: true, colour: 'red' },
  shouldFix: { text: 'Should fix', link: true, colour: 'yellow' },
  passed: { text: 'Passed', link: false, colour: 'green' }
}

/**
 * @param {import('express').Request} req request
 * @param {{ taskMessage: string, status: Status, issueType?: string, field?: string }}
 * @returns
 */
const makeTaskParam = (req, { taskMessage, status, ...opts }) => {
  if (status.link) {
    if (!opts.field) { throw new Error('Missing field in options') }
    if (!opts.issueType) { throw new Error('Missing issueType in options') }
  }
  return {
    title: {
      text: taskMessage
    },
    href: status.link && isIssueDetailsPageEnabled ? `/check/results/${req.params.id}/issue/${opts.issueType}/${opts.field}` : '',
    status: {
      tag: {
        text: status.text,
        classes: `govuk-tag--${status.colour}`
      }
    }
  }
}

export function getTotalRows (req, res, next) {
  const { responseDetails } = req.locals
  req.totalRows = responseDetails.getRows().length
  next()
}

/**
 * @param {*} req request
 * @param {number} level criteria level
 * @param {Status} status status meta data
 */
export function getTasksByLevel (req, level, status) {
  const { tasks, totalRows } = req
  const filteredTasks = tasks.filter(task => task.qualityCriteriaLevel === level)
  const taskParams = filteredTasks.map(task => {
    const taskMessage = performanceDbApi.getTaskMessage({
      issue_type: task.issueType,
      num_issues: task.count,
      rowCount: totalRows,
      field: task.field
    })
    return makeTaskParam(req, { taskMessage, status, issueType: task.issueType, field: task.field })
  })
  req.locals[`tasks${level === 2 ? 'Blocking' : 'NonBlocking'}`] = taskParams
}

export function getMissingColumnTasks (req) {
  const { responseDetails } = req.locals
  const taskMap = new Map()
  const tasks = []
  for (const column of responseDetails.getColumnFieldLog()) {
    if (column.missing) {
      taskMap.set(`missing column|${column.field}`, {
        issueType: 'missing column',
        field: column.field,
        qualityCriteriaLevel: 2, // = blocking issue
        count: 1
      })
      tasks.push(makeTaskParam(req, {
        taskMessage: `${column.field} column is missing`,
        status: taskStatus.mustFix,
        field: column.field,
        issueType: 'missing column'
      }))
    }
  }

  return { taskMap, tasks }
}

/**
 * Middleware. Updates `req.locals` with `tasksBlocking` and potentially updates
 * `req.aggregatedTasks` map with entrires for missing columns.
 *
 * @param {import('express').Request & { aggreatedTasks: Map<string, Object>}} req request
 * @param {*} res response
 * @param {*} next next function
 */
export function getBlockingTasks (req, res, next) {
  getTasksByLevel(req, 2, taskStatus.mustFix)

  // add tasks for missing columns
  const { tasks: missingColumnTasks, taskMap } = getMissingColumnTasks(req)
  req.locals.tasksBlocking = req.locals.tasksBlocking.concat(missingColumnTasks)
  for (const [k, v] of taskMap.entries()) {
    req.aggreatedTasks.set(k, v)
  }
  next()
}

export function getNonBlockingTasks (req, res, next) {
  getTasksByLevel(req, 3, taskStatus.shouldFix)
  next()
}

export function getPassedChecks (req, res, next) {
  const { tasks, totalRows } = req

  const passedChecks = []

  const makePassedCheck = (text) => makeTaskParam(req, { taskMessage: text, status: taskStatus.passed })

  // add task complete for how many rows are in the table
  if (totalRows > 0) {
    passedChecks.push(makePassedCheck(`Found ${totalRows} rows`))
  }

  // add task complete for no duplicate refs
  if (tasks.findIndex(task => task.issueType === 'reference values are not unique') < 0) {
    passedChecks.push(makePassedCheck('All rows have unique references'))
  }

  // add task complete for valid geoms
  if (tasks.findIndex(task => task.issueType === 'invalid WKT') < 0) {
    passedChecks.push(makePassedCheck('All rows have valid geometry'))
  }

  // add task complete for all data is valid
  if (tasks.length === 0) {
    passedChecks.push(makePassedCheck('All data is valid'))
  }

  req.locals.passedChecks = passedChecks

  next()
}

const validateParams = validateQueryParams({
  schema: v.object({
    pageNumber: v.optional(v.pipe(v.string(), v.transform(parseInt), v.minValue(1)), '1')
  })
})

export default ResultsController
