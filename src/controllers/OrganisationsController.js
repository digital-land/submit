import datasette from '../services/datasette.js'
import performanceDbApi from '../services/performanceDbApi.js' // Assume you have an API service module
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { dataSubjects } from '../utils/utils.js'
import { statusToTagClass } from '../filters/filters.js'
import { render } from '../utils/custom-renderer.js'
import { templateSchema } from '../routes/schemas.js'
import * as v from 'valibot'
import config from '../../config/index.js'

// get a list of available datasets
const availableDatasets = Object.values(dataSubjects)
  .flatMap(dataSubject =>
    dataSubject.dataSets
      .filter(dataset => dataset.available)
      .map(dataset => dataset.value)
  )

function validateAndRender (res, name, params) {
  const schema = templateSchema.get(name) ?? v.any()
  logger.info(`rendering '${name}' with schema=<${schema ? 'defined' : 'any'}>`, { type: types.App })
  return render(res, name, schema, params)
}

/**
 * Middleware. Attempts to fetch data and short-circuits with 404 when
 * data for given query does not exist. Meant to be used to fetch singular records.
 *
 * `this` needs `{ query({ req, params }) => any, result: string }`
 *
 * where the `result` is the key under which result of the query will be stored in `req`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function fetchOne (req, res, next) {
  logger.debug({ type: types.App, message: 'fetchOne', resultKey: this.result })
  const query = this.query({ req, params: req.params })
  const result = await datasette.runQuery(query)
  if (result.formattedData.length === 0) {
    // we can make the 404 more informative by informing the use what exactly was "not found"
    res.status(404).render('errorPages/404', { })
  } else {
    req[this.result] = result.formattedData[0]
    next()
  }
}

/**
 * Middleware. Set `req.handlerName` to a string that will identify
 * the function that threw the error.
 *
 * @param {Error} err
 * @param {{handlerName: string}} req
 * @param {*} res
 * @param {*} next
 */
const logPageError = (err, req, res, next) => {
  console.assert(req.handlerName, 'handlerName missing ')
  logger.warn({
    message: `OrganisationsController.${req.handlerName}(): ${err.message}`,
    endpoint: req.originalUrl,
    errorStack: err.stack,
    errorMessage: err.message,
    type: types.App
  })
  next(err)
}

/**
 * Middleware. Validates and renders the template.
 *
 * `this` needs: `{ templateParams(req), template,  handlerName }`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
function renderTemplate (req, res, next) {
  const templateParams = this.templateParams(req)
  try {
    validateAndRender(res, this.template, templateParams)
  } catch (err) {
    req.handlerName = this.handlerName
    next(err)
  }
}

const getGetStarted = renderTemplate.bind(
  {
    templateParams (req) {
      const { orgInfo: organisation, dataset } = req
      return { organisation, dataset }
    },
    template: 'organisations/get-started.html',
    handlerName: 'getStarted'
  }
)

const fetchOrgInfo = fetchOne.bind({
  query: ({ params }) => {
    return `SELECT name, organisation FROM organisation WHERE organisation = '${params.lpa}'`
  },
  result: 'orgInfo'
})

const fetchDatasetName = fetchOne.bind({
  query: ({ params }) => {
    return `SELECT name FROM dataset WHERE dataset = '${params.dataset}'`
  },
  result: 'dataset'
})

const fetchDatasetInfo = fetchOne.bind({
  query: ({ params }) => {
    return `SELECT name, dataset FROM dataset WHERE dataset = '${params.dataset}'`
  },
  result: 'dataset'
})

/**
 * Middleware.
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns {Promise<*>}
 */
async function fetchLpaOverview (req, res, next) {
  const { datasetsFilter } = config
  const overview = await performanceDbApi.getLpaOverview(req.params.lpa, { datasetsFilter })
  req.lpaOverview = overview
  next()
}

/**
 * Middleware.
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function fetchLatestResource (req, res, next) {
  const { lpa, dataset } = req.params
  const resource = await performanceDbApi.getLatestResource(lpa, dataset)
  req.resourceId = resource.resource
  next()
}

/**
 *
 * Middleware. Updates `req` with `issues`.
 *
 * Requires `resourceId` in request params or request (in that order).
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function fetchIssues (req, res, next) {
  const { dataset: datasetId, resourceId: passedResourceId, issue_type: issueType } = req.params
  const resourceId = passedResourceId ?? req.resourceId
  console.assert(resourceId, 'missng resourceId')
  const issues = await performanceDbApi.getIssues(req.resourceId, issueType, datasetId)
  req.issues = issues
  next()
}

/**
 *
 * Middleware. Updates `req` with `entryData`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 *
 */
async function fetchEntry (req, res, next) {
  const { dataset: datasetId, entityNumber } = req.params
  const entityNum = entityNumber ? parseInt(entityNumber) : 1
  req.entityNumber = entityNum
  req.entryData = await performanceDbApi.getEntry(req.resourceId, entityNum, datasetId)
  next()
}

/**
 * Middleware. Does a conditional fetch. Optionally invokes `else` if condition is false.
 *
 * `this` needs: `{ fetchFn, condition: (req) => boolean, else?: (req) => void }`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function maybeFetch (req, res, next) {
  if (this.condition(req)) {
    // `next` will be called in our fetchFn middleware
    const result = this.fetchFn(req, res, next)
    if (result instanceof Promise) {
      await result
    }
  } else {
    if (this.else) {
      this.else(req)
    }
    next()
  }
}

const maybeFetchLatestResource = maybeFetch.bind({
  fetchFn: fetchLatestResource,
  else: (req) => { req.resourceId = req.params.resourceId },
  condition: ({ params }) => !('resourceId' in params)
})

function prepareOverviewTemplateParams (req, res, next) {
  const { lpaOverview, orgInfo: organisation } = req

  const datasets = Object.entries(lpaOverview.datasets).map(([key, value]) => {
    return {
      slug: key,
      ...value
    }
  })

  // add in any of the missing key 8 datasets
  const keys = Object.keys(lpaOverview.datasets)
  availableDatasets.forEach(dataset => {
    if (!keys.includes(dataset)) {
      datasets.push({
        slug: dataset,
        endpoint: null,
        issue_count: 0,
        status: 'Not submitted'
      })
    }
  })

  const totalDatasets = datasets.length
  const [datasetsWithEndpoints, datasetsWithIssues, datasetsWithErrors] = datasets.reduce((accumulator, dataset) => {
    if (dataset.endpoint) accumulator[0]++
    if (dataset.status === 'Needs fixing') accumulator[1]++
    if (dataset.status === 'Error') accumulator[2]++
    return accumulator
  }, [0, 0, 0])

  req.templateParams = {
    organisation,
    datasets,
    totalDatasets,
    datasetsWithEndpoints,
    datasetsWithIssues,
    datasetsWithErrors
  }

  next()
}

const getOverview = renderTemplate.bind({
  templateParams (req) {
    if (!req.templateParams) throw new Error('missing templateParams')
    return req.templateParams
  },
  template: 'organisations/overview.html',
  handlerName: 'getOverview'
})

/**
 * Middleware. Validates query params according to schema.
 * Short circuits with 400 error if validation fails
 *
 * `this` needs: `{ schema }`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
function validateQueryParams (req, res, next) {
  try {
    v.parse(this.schema || v.any(), req.params)
    next()
  } catch (error) {
    res.status(400).render('errorPages/400', { })
  }
}

export const IssueDetailsQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  entityNumber: v.optional(v.string()),
  resourceId: v.optional(v.string())
})

const validateIssueDetailsQueryParams = validateQueryParams.bind({ schema: IssueDetailsQueryParams })

/**
 *
 * @param {*} text
 * @param {*} html
 * @param {*} classes
 * @returns {{key: {text: string}, value: { html: string}, classes: string}}
 */
const issueField = (text, html, classes) => {
  return {
    key: {
      text
    },
    value: {
      html
    },
    classes
  }
}

/**
 *
 * @param {string} errorMessage
 * @param {{value: string}?} issue
 * @returns {string}
 */
const issueErrorMessageHtml = (errorMessage, issue) => `<p class="govuk-error-message">${errorMessage}</p>${issue.value ?? ''}`

/**
 *
 * @param {*} issueType
 * @param {*} issuesByEntryNumber
 * @param {*} row
 * @returns {{key: {text: string}, value: { html: string}, classes: string}}
 */
const processEntryRow = (issueType, issuesByEntryNumber, row) => {
  const { entry_number: entryNumber } = row
  console.assert(entryNumber, 'precessEntryRow(): entry_number not in row')
  let hasError = false
  let issueIndex
  if (issuesByEntryNumber[entryNumber]) {
    issueIndex = issuesByEntryNumber[entryNumber].findIndex(issue => issue.field === row.field)
    hasError = issueIndex >= 0
  }

  let valueHtml = ''
  let classes = ''
  if (hasError) {
    const message = issuesByEntryNumber[entryNumber][issueIndex].message || issueType
    valueHtml += issueErrorMessageHtml(message, null)
    classes += 'dl-summary-card-list__row--error'
  }
  valueHtml += row.value

  return issueField(row.field, valueHtml, classes)
}

/***
 * Middleware. Updates req with `templateParams`
 */
function prepareIssueDetailsTemplateParams (req, res, next) {
  const { issues, entryData, entityNumber } = req
  const { lpa, dataset: datasetId, issue_type: issueType } = req.params

  const issuesByEntryNumber = issues.reduce((acc, current) => {
    acc[current.entry_number] = acc[current.entry_number] || []
    acc[current.entry_number].push(current)
    return acc
  }, {})

  const issueItems = Object.entries(issuesByEntryNumber).map(([entryNumber, issues]) => {
    return {
      html: performanceDbApi.getTaskMessage(issueType, issues.length) + ` in record ${entryNumber}`,
      href: `/organisations/${lpa}/${datasetId}/${issueType}/${entryNumber}`
    }
  })

  const errorHeading = performanceDbApi.getTaskMessage(issueType, Object.keys(issuesByEntryNumber).length, true)
  const fields = entryData.map((row) => processEntryRow(issueType, issuesByEntryNumber, row))
  const entityIssues = issuesByEntryNumber[entityNumber] || []
  for (const issue of entityIssues) {
    if (!fields.find(field => field.key.text === issue.field)) {
      const errorMessage = issue.message || issueType
      // TODO: pull the html out of here and into the template
      const valueHtml = issueErrorMessageHtml(errorMessage, issue.value)
      const classes = 'dl-summary-card-list__row--error'

      fields.push(issueField(issue.field, valueHtml, classes))
    }
  }

  const entry = {
    title: `entry: ${entityNumber}`,
    fields
  }

  // schema: OrgIssueDetails
  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
    errorHeading,
    issueItems,
    entry,
    issueType
  }

  next()
}

/**
 * Middleware. Renders the issue details page with the list of issues, entry data,
 * and organisation and dataset details.
 */
const getIssueDetails = renderTemplate.bind({
  templateParams: (req) => req.templateParams,
  template: 'organisations/issueDetails.html',
  handlerName: 'getIssueDetails'
})

const getGetStartedMiddleware = [fetchOrgInfo, fetchDatasetName, getGetStarted, logPageError]

const getOverviewMiddleware = [fetchOrgInfo, fetchLpaOverview, prepareOverviewTemplateParams, getOverview, logPageError]

const getIssueDetailsMiddleware = [
  validateIssueDetailsQueryParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  maybeFetchLatestResource,
  fetchIssues,
  fetchEntry,
  prepareIssueDetailsTemplateParams,
  getIssueDetails
]

/**
 * Returns a status tag object with a text label and a CSS class based on the status.
 *
 * @param {string} status - The status to generate a tag for (e.g. "Error", "Needs fixing", etc.)
 * @returns {object} - An object with a `tag` property containing the text label and CSS class.
 */
function getStatusTag (status) {
  return {
    tag: {
      text: status,
      classes: statusToTagClass(status)
    }
  }
}

const organisationsController = {

  /**
   * Handles the GET /organisations request
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getOrganisations (req, res, next) {
    try {
      const sql = 'select name, organisation from organisation'
      const result = await datasette.runQuery(sql)

      const sortedResults = result.formattedData.sort((a, b) => {
        return a.name.localeCompare(b.name)
      })

      const alphabetisedOrgs = sortedResults.reduce((acc, current) => {
        const firstLetter = current.name.charAt(0).toUpperCase()
        acc[firstLetter] = acc[firstLetter] || []
        acc[firstLetter].push(current)
        return acc
      }, {})

      validateAndRender(res, 'organisations/find.html', { alphabetisedOrgs })
    } catch (err) {
      logger.warn('organisationsController.getOrganisations(): ' + err.message ?? err.errorMessage, { type: types.App })
      next(err)
    }
  },

  /**
 * Handles GET requests for the dataset task list page.
 *
 * @param {Express.Request} req - The incoming request object.
 * @param {Express.Response} res - The response object to send back to the client.
 * @param {Express.NextFunction} next - The next function in the middleware chain.
 *
 * Retrieves the organisation and dataset names from the database, fetches the issues for the given LPA and dataset,
 * and renders the dataset task list page with the list of tasks and organisation and dataset details.
 */
  async getDatasetTaskList (req, res, next) {
    const lpa = req.params.lpa
    const datasetId = req.params.dataset

    try {
      const organisationResult = await datasette.runQuery(`SELECT name, organisation FROM organisation WHERE organisation = '${lpa}'`)
      const organisation = organisationResult.formattedData[0]

      const datasetResult = await datasette.runQuery(`SELECT name FROM dataset WHERE dataset = '${datasetId}'`)
      const dataset = datasetResult.formattedData[0]

      const issues = await performanceDbApi.getLpaDatasetIssues(lpa, datasetId)

      const taskList = issues.map((issue) => {
        return {
          title: {
            text: performanceDbApi.getTaskMessage(issue.issue_type, issue.num_issues)
          },
          href: `/organisations/${lpa}/${datasetId}/${issue.issue_type}`,
          status: getStatusTag(issue.status)
        }
      })

      const params = {
        taskList,
        organisation,
        dataset
      }

      validateAndRender(res, 'organisations/datasetTaskList.html', params)
    } catch (e) {
      logger.warn(`getDatasetTaskList() failed for lpa='${lpa}', datasetId='${datasetId}'`,
        {
          type: types.App,
          errorMessage: e.message,
          errorStack: e.stack
        })
      next(e)
    }
  },

  async getEndpointError (req, res, next, { resourceStatus }) {
    const { lpa, dataset: datasetId } = req.params

    try {
      const organisationResult = await datasette.runQuery(`SELECT name, organisation FROM organisation WHERE organisation = '${lpa}'`)
      const organisation = organisationResult.formattedData[0]

      const datasetResult = await datasette.runQuery(`SELECT name FROM dataset WHERE dataset = '${datasetId}'`)
      const dataset = datasetResult.formattedData[0]

      const daysSince200 = resourceStatus.days_since_200
      const today = new Date()
      const last200Date = new Date(today.getTime() - (daysSince200 * 24 * 60 * 60 * 1000))
      const last200Datetime = last200Date.toISOString().slice(0, 19) + 'Z'

      const params = {
        organisation,
        dataset,
        errorData: {
          endpoint_url: resourceStatus.endpoint_url,
          http_status: resourceStatus.status,
          latest_log_entry_date: resourceStatus.latest_log_entry_date,
          latest_200_date: last200Datetime
        }
      }
      validateAndRender(res, 'organisations/http-error.html', params)
    } catch (e) {
      logger.warn(`conditionalTaskListHandler() failed for lpa='${lpa}', datasetId='${datasetId}'`, { type: types.App })
      next(e)
    }
  },

  async conditionalTaskListHandler (req, res, next) {
    const { lpa, dataset: datasetId } = req.params

    try {
      const resourceStatus = await performanceDbApi.getResourceStatus(lpa, datasetId)

      if (resourceStatus.status !== '200') {
        return await organisationsController.getEndpointError(req, res, next, { resourceStatus })
      } else {
        return await organisationsController.getDatasetTaskList(req, res, next)
      }
    } catch (e) {
      logger.warn(`conditionalTaskListHandler() failed for lpa='${lpa}', datasetId='${datasetId}'`, { type: types.App })
      next(e)
    }
  },

  /**
   * Middleware chain for GET requests for the "Get Started" page.
   */
  getGetStartedMiddleware,
  getGetStarted,

  getOverviewMiddleware,
  getOverview,
  prepareOverviewTemplateParams,

  getIssueDetailsMiddleware,
  getIssueDetails,
  prepareIssueDetailsTemplateParams,
  IssueDetailsQueryParams
}

export default organisationsController
