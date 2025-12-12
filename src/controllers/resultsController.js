import * as v from 'valibot'
import config from '../../config/index.js'
import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import { fetchMany } from '../middleware/middleware.builders.js'
import { validateQueryParams } from '../middleware/common.middleware.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { isFeatureEnabled } from '../utils/features.js'
import { splitByLeading } from '../utils/table.js'
import { MiddlewareError } from '../utils/errors.js'

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
    this.use(fetchDatasetTypology)
    this.use(fetchResponseDetails)
    this.use(checkForErroredResponse)
    this.use(setupTableParams)
    this.use(getIssueTypesWithQualityCriteriaLevels)
    this.use(extractIssuesFromResults)
    this.use(filterOutInternalIssues)
    this.use(addQualityCriteriaLevelsToIssues)
    this.use(aggregateIssues)
    this.use(getTotalRows)
    this.use(getBlockingTasks)
    this.use(getNonBlockingTasks)
    this.use(getPassedChecks)
    this.use(setupError)
    this.use(getFileNameOrUrlAndCheckedTime)
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
    if (error.response && error.response.status === 404) {
      return next(new MiddlewareError(`No async request with id=${req.params.id}`, 404))
    }
    next(error)
  }
}

export async function checkForErroredResponse (req, res, next) {
  if (req.locals.requestData.response?.error) {
    const { errMsg, errMsgDetail } = req.locals.requestData.response.error
    if (errMsg && errMsg.length > 0) {
      return next(new MiddlewareError(errMsg, 500, { template: 'check/error-redirect.html', errorDetail: errMsgDetail }))
    } else {
      return next(new MiddlewareError('An unknown error occured when processing your endpoint', 500, { template: 'check/error-redirect.html' }))
    }
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

/**
 * @typedef {Object} DetailsOptions
 * @property {string} [severity] - Severity filter
 * @property {Object} [issue] - Issue filter
 * @property {string} issue.issueType - Issue type
 * @property {string} issue.field - Field name
 */

/**
 * @typedef {Object} RequestWithDetails
 * @property {Object} parsedParams
 * @property {Object} locals - Request locals
 * @property {Object} locals.requestData
 * @property {Object} locals.responseDetails
 * @property {string} locals.template
 * @property {DetailsOptions} [locals.detailsOptions] - Details options
 */

/**
 * @param {RequestWithDetails} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
export async function fetchResponseDetails (req, res, next) {
  const { pageNumber } = req.parsedParams
  try {
    if (req.locals.template !== failedFileRequestTemplate && req.locals.template !== failedUrlRequestTemplate) {
      const detailsOpts = req.locals.detailsOptions ?? {}
      const responseDetails = req.locals.template === resultsTemplate
        // pageNumber starts with: 1, fetchResponseDetails parameter `pageOffset` starts with 0
        ? await req.locals.requestData.fetchResponseDetails(pageNumber - 1, 50, { severity: 'error', ...detailsOpts })
        : await req.locals.requestData.fetchResponseDetails(pageNumber - 1, 50, { ...detailsOpts })
      req.locals.responseDetails = responseDetails
    }
  } catch (e) {
    next(e)
    return
  }
  next()
}

/**
 * @param {Object} row a 'converted_row' from the response
 * @returns {Map<string,string>}
 */
export const fieldToColumnMapping = ({ columns }) => {
  const tuple = ([fieldName, { column }]) => [fieldName, column]
  const mapping = new Map(Object.entries(columns).map(tuple))
  return mapping
}

/**
 * @param {RequestWithDetails} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 * @returns {void}
 */
export function setupTableParams (req, res, next) {
  if (req.locals.template !== failedFileRequestTemplate && req.locals.template !== failedUrlRequestTemplate) {
    const responseDetails = req.locals.responseDetails
    let rows = responseDetails.getRowsWithVerboseColumns(req.locals.requestData.hasErrors())
    // remove any issues that aren't of severity error
    rows = rows.map((row) => {
      const { columns, ...rest } = row

      const columnsOnlyErrors = Object.fromEntries(Object.entries(columns).map(([key, value]) => {
        let error
        if (value.error && value.error.severity === 'error' && value.error.responsibility !== 'internal') {
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

    const fieldToColumn = rows.length > 0 ? fieldToColumnMapping(rows[0]) : new Map()
    const columnToField = new Map()
    for (const [k, v] of fieldToColumn.entries()) {
      columnToField.set(v, k)
    }

    const { leading: leadingFields, trailing: trailingFields } = splitByLeading({ fields: responseDetails.getFields() })
    // NOTE: the column field log alters the field names (converts '_' -> '-', most of the time 🤷‍♂️), but we want
    // the original CSV column names because that's what users expect
    const orderedFields = [...leadingFields, ...trailingFields]
    const columns = orderedFields
    const fields = orderedFields
    req.locals.tableParams = {
      columns,
      fields,
      rows,
      columnNameProcessing: 'none',
      mapping: columnToField
    }
    req.locals.geometries =
      req.locals.datasetTypology === 'geography'
        ? responseDetails.getGeometries()
        : null
    // pagination is on the 'table' tab, so we want to ensure clicking those
    // links takes us to a page with the table tab *selected*
    const { pageNumber } = req.parsedParams
    const pagination = responseDetails.getPagination(pageNumber, { hash: '#table-tab' })
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

export function filterOutInternalIssues (req, res, next) {
  const { issues } = req
  req.issues = issues.filter(issue => issue.responsibility !== 'internal')
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

  req.aggregatedTasks = taskMap
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
 * @typedef {Object} Status
 * @property {string} text - Status text
 * @property {boolean} link - Whether status has a link
 * @property {string} colour - Status color
 */

/** @type {{mustFix: Status, shouldFix: Status, passed: Status}} */
const taskStatus = {
  mustFix: { text: 'Must fix', link: true, colour: 'red' },
  shouldFix: { text: 'Should fix', link: true, colour: 'yellow' },
  passed: { text: 'Passed', link: false, colour: 'green' }
}

/**
 * @param {Object} req - Express request object
 * @param {Object} options - Task options
 * @param {string} options.taskMessage - Task message text
 * @param {Status} options.status - Status object
 * @param {string} [options.issueType] - Issue type
 * @param {string} [options.field] - Field name
 * @returns {Object} Task parameter object
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
  const totalRows = Number.parseInt(responseDetails.pagination.totalResults)
  // NOTE: the fallback number may not be accurate, but it's better than just giving up and throwing
  req.totalRows = Number.isInteger(totalRows) ? totalRows : responseDetails.getRows().length
  next()
}

/**
 * @param {*} req request
 * @param {number} level criteria level
 * @param {Status} status status meta data
 */
export function getTasksByLevel (req, level, status) {
  const { tasks, totalRows } = req
  const dataset = req.locals.requestData?.getParams?.()?.dataset

  const filteredTasks = tasks.filter(task => task.qualityCriteriaLevel === level)
  const taskParams = filteredTasks.map(task => {
    const taskMessage = performanceDbApi.getTaskMessage({
      issue_type: task.issueType,
      num_issues: task.count,
      rowCount: totalRows,
      field: task.field,
      dataset
    })
    return makeTaskParam(req, { taskMessage, status, issueType: task.issueType, field: task.field })
  })
  req.locals[`tasks${level === 2 ? 'Blocking' : 'NonBlocking'}`] = taskParams
}

export const missingColumnTaskMessage = (field) => {
  return `${field} column is missing`
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
        taskMessage: missingColumnTaskMessage(column.field),
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
 * `req.aggregatedTasks` map with entries for missing columns.
 *
 * @param {Object} req - Express request object
 * @param {Map<string, Object>} req.aggregatedTasks - Map of tasks
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export function getBlockingTasks (req, res, next) {
  getTasksByLevel(req, 2, taskStatus.mustFix)

  // add tasks for missing columns
  const { tasks: missingColumnTasks, taskMap } = getMissingColumnTasks(req)
  req.locals.tasksBlocking = req.locals.tasksBlocking.concat(missingColumnTasks)
  req.missingColumnTasks = missingColumnTasks
  for (const [k, v] of taskMap.entries()) {
    req.aggregatedTasks.set(k, v)
  }
  next()
}

export function getNonBlockingTasks (req, res, next) {
  getTasksByLevel(req, 3, taskStatus.shouldFix)
  next()
}

export function getPassedChecks (req, res, next) {
  const { tasks, totalRows, missingColumnTasks } = req

  const passedChecks = []
  const makePassedCheck = (text) => makeTaskParam(req, { taskMessage: text, status: taskStatus.passed })

  if (missingColumnTasks.length > 0 || tasks.length > 0) {
    // add task complete for no duplicate refs
    const foundRefColMissing = missingColumnTasks.findIndex(task => task.title.text === 'reference column is missing') >= 0
    const foundRefValsNotUnique = tasks.findIndex(task => task.issueType === 'reference values are not unique') >= 0
    if (!foundRefColMissing && !foundRefValsNotUnique) {
      passedChecks.push(makePassedCheck('All rows have unique references'))
    }

    // add task complete for valid geoms
    const foundGeometryColMissing = missingColumnTasks.findIndex(task => task.title.text === 'geometry column is missing') >= 0
    const foundInvalidWKT = tasks.findIndex(task => task.issueType === 'invalid WKT') >= 0
    if (req.locals.datasetTypology === 'geography' && !foundGeometryColMissing && !foundInvalidWKT) {
      passedChecks.push(makePassedCheck('All rows have valid geometry'))
    }
  }

  // add task complete for how many rows are in the table
  if (totalRows > 0) {
    passedChecks.unshift(makePassedCheck(`Found ${totalRows} rows`))

    if (tasks.length === 0 && missingColumnTasks.length === 0) {
      passedChecks.push(makePassedCheck('All data is valid'))
    }
  }

  req.locals.passedChecks = passedChecks

  next()
}

/**
 * Middleware to extract file name, URL, and checked time from the request data.
 * Updates `req.locals.uploadInfo` with the extracted information.
 *
 * @param {import('express').Request} req - The request object.
 * @param {import('express').Response} res - The response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 */
export function getFileNameOrUrlAndCheckedTime (req, res, next) {
  const { requestData } = req.locals
  req.locals.uploadInfo = {
    type: requestData?.params?.type,
    fileName: requestData?.params?.original_filename,
    url: requestData?.params?.url,
    checkedTime: requestData?.modified
  }
  next()
}

const validateParams = validateQueryParams({
  schema: v.object({
    pageNumber: v.optional(v.pipe(v.string(), v.transform(parseInt), v.minValue(1)), '1')
  })
})

/**
 * Middleware to fetch typology of dataset.
 * @param {*} req - request object
 * @param {*} res - response object
 * @param {*} next - next middleware function
 */
async function fetchDatasetTypology (req, res, next) {
  const datasetName = req.locals.requestData?.getParams?.()?.dataset
  if (!datasetName) {
    req.locals.datasetTypology = null
    return next()
  }
  try {
    const response = await fetch(`${config.mainWebsiteUrl}/dataset/${datasetName}.json`)
    if (!response.ok) {
      req.locals.datasetTypology = null
      return next()
    }
    const data = await response.json()
    req.locals.datasetTypology = data?.typology || null
    next()
  } catch (error) {
    req.locals.datasetTypology = null
    next()
  }
}

export default ResultsController
