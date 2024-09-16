import datasette from '../services/datasette.js'
import performanceDbApi from '../services/performanceDbApi.js' // Assume you have an API service module
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { dataSubjects } from '../utils/utils.js'
import { statusToTagClass } from '../filters/filters.js'
import * as v from 'valibot'
import { pagination } from '../utils/pagination.js'
import config from '../../config/index.js'
import {
  fetchOne,
  fetchMany,
  logPageError,
  maybeFetch,
  renderTemplate,
  validateAndRender
} from './middleware.js'
import { getDatasetStats, getLatestDatasetGeometryEntriesForLpa } from '../services/DatasetService.js'

// get a list of available datasets
const availableDatasets = Object.values(dataSubjects).flatMap((dataSubject) =>
  dataSubject.dataSets
    .filter((dataset) => dataset.available)
    .map((dataset) => dataset.value)
)

const getGetStarted = renderTemplate.bind({
  templateParams (req) {
    const { orgInfo: organisation, dataset } = req
    return { organisation, dataset }
  },
  template: 'organisations/get-started.html',
  handlerName: 'getStarted'
})

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

const fetchDatasetGeometries = async (req, res, next) => {
  const datasetEntries = await getLatestDatasetGeometryEntriesForLpa(req.params.dataset, req.params.lpa)
  req.geometries = datasetEntries.map(entry => entry.value)

  next()
}

const fetchDatasetStats = async (req, res, next) => {
  req.stats = await getDatasetStats(req.params.dataset, req.params.lpa)

  next()
}

const getDatasetOverview = renderTemplate.bind(
  {
    templateParams (req) {
      const { orgInfo: organisation, dataset, geometries, stats } = req
      return { organisation, dataset, geometries, stats }
    },
    template: 'organisations/dataset-overview.html',
    handlerName: 'datasetOverview'
  }
)

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
  try {
    const overview = await performanceDbApi.getLpaOverview(req.params.lpa, {
      datasetsFilter
    })
    req.lpaOverview = overview
    next()
  } catch (error) {
    next(error)
  }
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
  try {
    const resource = await performanceDbApi.getLatestResource(lpa, dataset)
    req.resourceId = resource.resource
    next()
  } catch (error) {
    next(error)
  }
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
  const { dataset: datasetId, resourceId: passedResourceId, issue_type: issueType, issue_field: issueField } = req.params
  const resourceId = passedResourceId ?? req.resourceId
  console.assert(resourceId, 'missng resourceId')
  try {
    const issues = await performanceDbApi.getIssues({ resource: req.resourceId, issueType, issueField }, datasetId)
    req.issues = issues
    next()
  } catch (error) {
    next(error)
  }
}

/**
 *
 * Middleware. Updates `req` with `issues`.
 *
 * Requires `issues` in request.
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function reformatIssuesToBeByEntryNumber (req, res, next) {
  const { issues } = req
  const issuesByEntryNumber = issues.reduce((acc, current) => {
    acc[current.entry_number] = acc[current.entry_number] || []
    acc[current.entry_number].push(current)
    return acc
  }, {})
  req.issuesByEntryNumber = issuesByEntryNumber
  next()
}

/**
 *
 * Middleware. Updates `req` with `issueEntitiesCount` which is the count of entities that have issues.
 *
 * Requires `resourceId` in request params or request (in that order).
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function fetchIssueEntitiesCount (req, res, next) {
  const { dataset: datasetId, resourceId: passedResourceId, issue_type: issueType, issue_field: issueField } = req.params
  const resourceId = passedResourceId ?? req.resourceId
  console.assert(resourceId, 'missng resourceId')
  const issueEntitiesCount = await performanceDbApi.getEntitiesWithIssuesCount({ resource: resourceId, issueType, issueField }, datasetId)
  req.issueEntitiesCount = parseInt(issueEntitiesCount)
  next()
}

/**
 *
 * Middleware. Updates `req` with `issueEntitiesCount` which is the count of entities that have issues.
 *
 * Requires `resourceId` in request params or request (in that order).
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function fetchEntityCount (req, res, next) {
  const { dataset: datasetId, resourceId: passedResourceId } = req.params
  const resourceId = passedResourceId ?? req.resourceId
  console.assert(resourceId, 'missng resourceId')

  const entityCount = await performanceDbApi.getEntityCount(resourceId, datasetId)
  req.entityCount = entityCount
  next()
}

/**
 *
 * Middleware. Updates `req` with `entryData`
 *
 * Requires `pageNumber`, `dataset` and
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 *
 */
async function fetchEntry (req, res, next) {
  const { dataset: datasetId, pageNumber } = req.params
  const { issuesByEntryNumber } = req
  const pageNum = pageNumber ? parseInt(pageNumber) : 1
  req.pageNumber = pageNum

  // look at issue Entries and get the index of that entry - 1

  const entityNum =
    Object.values(issuesByEntryNumber)[pageNum - 1][0].entry_number

  req.entryData = await performanceDbApi.getEntry(
    req.resourceId,
    entityNum,
    datasetId
  )
  req.entryNumber = entityNum
  next()
}

const maybeFetchLatestResource = maybeFetch.bind({
  fetchFn: fetchLatestResource,
  else: (req) => {
    req.resourceId = req.params.resourceId
  },
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
  availableDatasets.forEach((dataset) => {
    if (!keys.includes(dataset)) {
      datasets.push({
        slug: dataset,
        endpoint: null,
        issue_count: 0,
        status: 'Not submitted'
      })
    }
  })

  // re-sort the datasets to be in alphabetical order
  datasets.sort((a, b) => a.slug.localeCompare(b.slug))

  const totalDatasets = datasets.length
  const [datasetsWithEndpoints, datasetsWithIssues, datasetsWithErrors] =
    datasets.reduce(
      (accumulator, dataset) => {
        if (dataset.endpoint) accumulator[0]++
        if (dataset.status === 'Needs fixing') accumulator[1]++
        if (dataset.status === 'Error') accumulator[2]++
        return accumulator
      },
      [0, 0, 0]
    )

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
    res.status(400).render('errorPages/400', {})
  }
}

export const IssueDetailsQueryParams = v.object({
  lpa: v.string(),
  dataset: v.string(),
  issue_type: v.string(),
  issue_field: v.string(),
  pageNumber: v.optional(v.string()),
  resourceId: v.optional(v.string())
})

const validateIssueDetailsQueryParams = validateQueryParams.bind({
  schema: IssueDetailsQueryParams
})

/**
 *
 * @param {*} text
 * @param {*} html
 * @param {*} classes
 * @returns {{key: {text: string}, value: { html: string}, classes: string}}
 */
const getIssueField = (text, html, classes) => {
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
const issueErrorMessageHtml = (errorMessage, issue) =>
  `<p class="govuk-error-message">${errorMessage}</p>${
    issue ? issue.value ?? '' : ''
  }`

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
    issueIndex = issuesByEntryNumber[entryNumber].findIndex(
      (issue) => issue.field === row.field
    )
    hasError = issueIndex >= 0
  }

  let valueHtml = ''
  let classes = ''
  if (hasError) {
    const message =
      issuesByEntryNumber[entryNumber][issueIndex].message || issueType
    valueHtml += issueErrorMessageHtml(message, null)
    classes += 'dl-summary-card-list__row--error'
  }
  valueHtml += row.value

  return getIssueField(row.field, valueHtml, classes)
}

/***
 * Middleware. Updates req with `templateParams`
 */
function prepareIssueDetailsTemplateParams (req, res, next) {
  const { entryData, pageNumber, issueEntitiesCount, issuesByEntryNumber, entryNumber, entityCount } = req
  const { lpa, dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params

  let errorHeading
  let issueItems

  const BaseSubpath = `/organisations/${lpa}/${datasetId}/${issueType}/${issueField}/`

  if (Object.keys(issuesByEntryNumber).length < entityCount) {
    errorHeading = performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issueEntitiesCount, entityCount, field: issueField }, true)
    issueItems = Object.entries(issuesByEntryNumber).map(([entryNumber, issues], i) => {
      const pageNum = i + 1
      return {
        html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: 1, field: issueField }) + ` in record ${entryNumber}`,
        href: `${BaseSubpath}${pageNum}`
      }
    })
  } else {
    issueItems = [{
      html: performanceDbApi.getTaskMessage({ issue_type: issueType, num_issues: issueEntitiesCount, entityCount, field: issueField }, true)
    }]
  }

  const fields = entryData.map((row) => processEntryRow(issueType, issuesByEntryNumber, row))
  const entityIssues = Object.values(issuesByEntryNumber)[pageNumber - 1] || []
  for (const issue of entityIssues) {
    if (!fields.find((field) => field.key.text === issue.field)) {
      const errorMessage = issue.message || issueType
      // TODO: pull the html out of here and into the template
      const valueHtml = issueErrorMessageHtml(errorMessage, issue.value)
      const classes = 'dl-summary-card-list__row--error'

      fields.push(getIssueField(issue.field, valueHtml, classes))
    }
  }

  const geometries = entryData
    .filter((row) => row.field === 'geometry')
    .map((row) => row.value)
  const entry = {
    title: `entry: ${entryNumber}`,
    fields,
    geometries
  }

  const paginationObj = {}
  if (pageNumber > 1) {
    paginationObj.previous = {
      href: `${BaseSubpath}${pageNumber - 1}`
    }
  }

  if (pageNumber < issueEntitiesCount) {
    paginationObj.next = {
      href: `${BaseSubpath}${pageNumber + 1}`
    }
  }

  paginationObj.items = pagination(issueEntitiesCount, pageNumber).map(item => {
    if (item === '...') {
      return {
        type: 'ellipsis',
        ellipsis: true,
        href: '#'
      }
    } else {
      return {
        type: 'item',
        number: item,
        href: `${BaseSubpath}${item}`,
        current: pageNumber === parseInt(item)
      }
    }
  })

  // schema: OrgIssueDetails
  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
    errorHeading,
    issueItems,
    entry,
    issueType,
    pagination: paginationObj,
    issueEntitiesCount,
    pageNumber
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

const getGetStartedMiddleware = [
  fetchOrgInfo,
  fetchDatasetName,
  getGetStarted,
  logPageError
]

const getDatasetOverviewMiddleware = [fetchOrgInfo, fetchDatasetName, fetchDatasetGeometries, fetchDatasetStats, getDatasetOverview, logPageError]

const getOverviewMiddleware = [
  fetchOrgInfo,
  fetchLpaOverview,
  prepareOverviewTemplateParams,
  getOverview,
  logPageError
]

const getIssueDetailsMiddleware = [
  validateIssueDetailsQueryParams,
  fetchOrgInfo,
  fetchDatasetInfo,
  maybeFetchLatestResource,
  fetchIssues,
  reformatIssuesToBeByEntryNumber,
  fetchEntry,
  fetchEntityCount,
  fetchIssueEntitiesCount,
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]

const fetchOrganisations = fetchMany.bind({
  query: ({ req, params }) => 'select name, organisation from organisation',
  result: 'organisations'
})

/**
 * Middleware. Updates req with `templateParams`.
 *
 * @param {{ organisations: {}[] }} req
 * @param {*} res
 * @param {*} next
 */
const prepareGetOrganisationsTemplateParams = (req, res, next) => {
  const sortedResults = req.organisations.formattedData.sort((a, b) => {
    return a.name.localeCompare(b.name)
  })

  const alphabetisedOrgs = sortedResults.reduce((acc, current) => {
    const firstLetter = current.name.charAt(0).toUpperCase()
    acc[firstLetter] = acc[firstLetter] || []
    acc[firstLetter].push(current)
    return acc
  }, {})

  req.templateParams = { alphabetisedOrgs }

  next()
}

const getOrganisations = renderTemplate.bind({
  templateParams: (req) => req.templateParams,
  template: 'organisations/find.html',
  handlerName: 'getOrganisations'
})

const getOrganisationsMiddleware = [
  fetchOrganisations,
  prepareGetOrganisationsTemplateParams,
  getOrganisations,
  logPageError
]

// const getDatasetTaskListMiddleware = [
//   fetchOrgInfoWithStatGeo
// ]

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
      const organisationResult = await datasette.runQuery(
        /* sql */ `SELECT name, organisation, statistical_geography FROM organisation WHERE organisation = '${lpa}'`
      )
      const organisation = organisationResult.formattedData[0]

      const datasetResult = await datasette.runQuery(
        `SELECT dataset, name FROM dataset WHERE dataset = '${datasetId}'`
      )
      const dataset = datasetResult.formattedData[0]

      const resource = await performanceDbApi.getLatestResource(lpa, datasetId)

      const issues = await performanceDbApi.getLpaDatasetIssues(resource.resource, datasetId)

      const entityCount = await performanceDbApi.getEntityCount(resource.resource, datasetId)

      const taskList = issues.map((issue) => {
        return {
          title: {
            text: performanceDbApi.getTaskMessage({ ...issue, entityCount, field: issue.field })
          },
          href: `/organisations/${lpa}/${datasetId}/${issue.issue_type}/${issue.field}`,
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
      logger.warn(
        `getDatasetTaskList() failed for lpa='${lpa}', datasetId='${datasetId}'`,
        {
          type: types.App,
          errorMessage: e.message,
          errorStack: e.stack
        }
      )
      next(e)
    }
  },

  /**
   * Handles endpoint error responses for organizations.
   *
   * @param {Object} req - The incoming request object.
   * @param {Object} res - The outgoing response object.
   * @param {Function} next - The next middleware function in the chain.
   * @param {Object} resourceStatus - An object containing information about the resource status.
   *
   * @returns {Promise<void>} A promise that resolves when the error response has been rendered.
   *
   * @throws {Error} If an error occurs while processing the request.
   */
  async getEndpointError (req, res, next, { resourceStatus }) {
    const { lpa, dataset: datasetId } = req.params

    try {
      const organisationResult = await datasette.runQuery(
        `SELECT name, organisation FROM organisation WHERE organisation = '${lpa}'`
      )
      const organisation = organisationResult.formattedData[0]

      const datasetResult = await datasette.runQuery(
        `SELECT name FROM dataset WHERE dataset = '${datasetId}'`
      )
      const dataset = datasetResult.formattedData[0]

      const daysSince200 = resourceStatus.days_since_200
      const today = new Date()
      const last200Date = new Date(
        today.getTime() - daysSince200 * 24 * 60 * 60 * 1000
      )
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
      logger.warn(
        `conditionalTaskListHandler() failed for lpa='${lpa}', datasetId='${datasetId}'`,
        { type: types.App }
      )
      next(e)
    }
  },

  /**
   * Handles conditional task list request.
   *
   * @param {object} req - The HTTP request object.
   * @param {object} res - The HTTP response object.
   * @param {function} next - The next middleware function in the chain.
   *
   * @throws {Error} - If an error occurs while processing the request.
   *
   * @description
   * This function checks the resource status for a given LPA and dataset ID.
   * If the resource status is 200, it calls the `getDatasetTaskList` function to retrieve the task list.
   * Otherwise, it calls the `getEndpointError` function to handle the error.
   */
  async conditionalTaskListHandler (req, res, next) {
    const { lpa, dataset: datasetId } = req.params

    try {
      const resourceStatus = await performanceDbApi.getResourceStatus(
        lpa,
        datasetId
      )

      if (resourceStatus.status !== '200') {
        return await organisationsController.getEndpointError(req, res, next, {
          resourceStatus
        })
      } else {
        return await organisationsController.getDatasetTaskList(req, res, next)
      }
    } catch (e) {
      logger.warn(
        `conditionalTaskListHandler() failed for lpa='${lpa}', datasetId='${datasetId}'`,
        { type: types.App }
      )
      next(e)
    }
  },

  /**
   * Middleware chain for GET requests for the "Get Started" page.
   */
  getGetStartedMiddleware,
  getGetStarted,

  getDatasetOverviewMiddleware,
  getDatasetOverview,

  getOverviewMiddleware,
  getOverview,
  prepareOverviewTemplateParams,

  getIssueDetailsMiddleware,
  getIssueDetails,
  prepareIssueDetailsTemplateParams,
  IssueDetailsQueryParams,

  getOrganisationsMiddleware,
  prepareGetOrganisationsTemplateParams,
  fetchOrganisations,
  getOrganisations
}

export default organisationsController
