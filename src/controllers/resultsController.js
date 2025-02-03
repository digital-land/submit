import PageController from './pageController.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import prettifyColumnName from '../filters/prettifyColumnName.js'
import { fetchMany } from '../middleware/middleware.builders.js'
import performanceDbApi from '../services/performanceDbApi.js'

const failedFileRequestTemplate = 'results/failedFileRequest'
const failedUrlRequestTemplate = 'results/failedUrlRequest'
const resultsTemplate = 'results/results'

class ResultsController extends PageController {
  /* Custom middleware */
  middlewareSetup () {
    super.middlewareSetup()
    this.use(getRequestDataMiddleware)
    this.use(setupTemplate)
    this.use(fetchResponseDetails)
    this.use(setupTableParams)
    this.use(setupErrorSummary)
    this.use(getIssueTypesWithQualityCriteriaLevels)
    this.use(extractIssuesFromResults)
    this.use(addQualityCriteriaLevelsToIssues)
    this.use(aggrogateIssues)
    this.use(filterOutTasksByQualityCriterialLevel)
    this.use(getTotalRows)
    this.use(getBlockingTasks)
    this.use(getNonBlockingIssues)
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
  try {
    if (req.locals.template !== failedFileRequestTemplate && req.locals.template !== failedUrlRequestTemplate) {
      const responseDetails = req.locals.template === resultsTemplate
        ? await req.locals.requestData.fetchResponseDetails(req.params.pageNumber, 50, 'error')
        : await req.locals.requestData.fetchResponseDetails(req.params.pageNumber)
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

export function setupErrorSummary (req, res, next) {
  try {
    if (req.locals.template !== failedFileRequestTemplate && req.locals.template !== failedUrlRequestTemplate) {
      req.locals.errorSummary = req.locals.requestData.getErrorSummary().map(message => {
        return {
          text: message,
          href: ''
        }
      })
    }
    next()
  } catch (error) {
    next(error)
  }
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

  req.issues = issues.map(issue => {
    const issueType = issueTypes.find(issueType => issueType.issue_type === issue['issue-type'])
    return {
      ...issue,
      quality_criteria_level: issueType.quality_criteria_level
    }
  })

  next()
}

// aggrogate issues by issue_type into tasks
export function aggrogateIssues (req, res, next) {
  const { issues } = req

  req.tasks = issues.reduce((tasks, issue) => {
    const task = tasks.find(task => task.issueType === issue['issue-type'] && task.field === issue.field)
    if (!task) {
      tasks.push({
        issueType: issue['issue-type'],
        field: issue.field,
        qualityCriteriaLevel: issue.quality_criteria_level,
        count: 1
      })
    } else {
      task.count++
    }
    return tasks
  }, [])

  next()
}

export function filterOutTasksByQualityCriterialLevel (req, res, next) {
  const { tasks } = req

  req.tasks = tasks.filter(task => [2, 3].includes(task.qualityCriteriaLevel))
  next()
}

const makeTaskParam = (text, statusText, statusClasses) => {
  return {
    title: {
      text
    },
    href: '',
    status: {
      tag: {
        text: statusText,
        classes: statusClasses
      }
    }
  }
}

export function getTotalRows (req, res, next) {
  const { responseDetails } = req.locals
  req.totalRows = responseDetails.getRows().length
  next()
}

export function getBlockingTasks (req, res, next) {
  const { tasks, totalRows } = req

  req.locals.blockingTasks = tasks
    .filter(task => task.qualityCriteriaLevel === 2)
    .map(task => {
      const taskMessage = performanceDbApi.getTaskMessage({
        issue_type: task.issueType,
        num_issues: task.count,
        rowCount: totalRows,
        field: task.field
      })
      return makeTaskParam(taskMessage, 'Must fix', 'govuk-tag--red')
    })

  next()
}

export function getNonBlockingIssues (req, res, next) {
  const { tasks, totalRows } = req
  req.locals.nonBlockingTasks = tasks
    .filter(task => task.qualityCriteriaLevel === 3)
    .map(task => {
      const taskMessage = performanceDbApi.getTaskMessage({
        issue_type: task.issueType,
        num_issues: task.count,
        rowCount: totalRows,
        field: task.field
      })
      return makeTaskParam(taskMessage, 'Should fix', 'govuk-tag--yellow')
    })
  next()
}

export function getPassedChecks (req, res, next) {
  const { tasks, totalRows } = req

  const passedChecks = []

  const makePassedCheck = (text) => makeTaskParam(text, 'Passed', 'govuk-tag--green')

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

export default ResultsController
