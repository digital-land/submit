import performanceDbApi from '../services/performanceDbApi.js' // Assume you have an API service module
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { dataSubjects } from '../utils/utils.js'
import { statusToTagClass } from '../filters/filters.js'
import * as v from 'valibot'
import { pagination } from '../utils/pagination.js'
import config from '../../config/index.js'
import {
  fetchIf,
  fetchMany,
  fetchOne,
  logPageError,
  parallel,
  renderTemplate,
  FetchOptions,
  FetchOneFallbackPolicy
} from './middleware.js'
import { getDatasetStats, getLatestDatasetGeometryEntriesForLpa } from '../services/DatasetService.js'

// get a list of available datasets
const availableDatasets = Object.values(dataSubjects).flatMap((dataSubject) =>
  dataSubject.dataSets
    .filter((dataset) => dataset.available)
    .map((dataset) => dataset.value)
)

const getGetStarted = renderTemplate({
  templateParams (req) {
    const { orgInfo: organisation, dataset } = req
    return { organisation, dataset }
  },
  template: 'organisations/get-started.html',
  handlerName: 'getStarted'
})

const fetchOrgInfo = fetchOne({
  query: ({ params }) => {
    return `SELECT name, organisation FROM organisation WHERE organisation = '${params.lpa}'`
  },
  result: 'orgInfo'
})

const fetchDatasetInfo = fetchOne({
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

const getDatasetOverview = renderTemplate(
  {
    templateParams (req) {
      const { orgInfo: organisation, dataset, geometries, stats } = req
      return { organisation, dataset, geometries, stats }
    },
    template: 'organisations/dataset-overview.html',
    handlerName: 'datasetOverview'
  }
)

const fetchOrgInfoWithStatGeo = fetchOne({
  query: ({ params }) => {
    return /* sql */ `SELECT name, organisation, statistical_geography FROM organisation WHERE organisation = '${params.lpa}'`
  },
  result: 'orgInfo'
})

/**
 * Middleware.
 */
const fetchResourceStatus = fetchOne({
  query: ({ params }) => performanceDbApi.resourceStatusQuery(params.lpa, params.dataset),
  result: 'resourceStatus'
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
 * Middleware. Updates req with `resource`.
 */
const fetchLatestResource = fetchOne({
  query: ({ params }) => performanceDbApi.latestResourceQuery(params.lpa, params.dataset),
  result: 'resource'
})

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
  const { dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params
  const { resource: resourceId } = req.resource
  if (!resourceId) {
    logger.debug('fetchIssues(): missing resourceId', { type: types.App, params: req.params, resource: req.resource })
    throw Error('fetchIssues: missing resourceId')
  }

  try {
    const issues = await performanceDbApi.getIssues({ resource: resourceId, issueType, issueField }, datasetId)
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
 * Requires `req.resource.resource`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function fetchIssueEntitiesCount (req, res, next) {
  const { dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params
  const { resource: resourceId } = req.resource
  console.assert(resourceId, 'missng resource id')
  const issueEntitiesCount = await performanceDbApi.getEntitiesWithIssuesCount({ resource: resourceId, issueType, issueField }, datasetId)
  req.issueEntitiesCount = parseInt(issueEntitiesCount)
  next()
}

const fetchEntityCount = fetchOne({
  query: ({ req }) => performanceDbApi.entityCountQuery(req.resource.resource),
  result: 'entityCount',
  dataset: FetchOptions.fromParams,
  fallbackPolicy: FetchOneFallbackPolicy.continue
})

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

const getOverview = renderTemplate({
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
  const { entryData, pageNumber, issueEntitiesCount, issuesByEntryNumber, entryNumber, entityCount: entityCountRow } = req
  const { lpa, dataset: datasetId, issue_type: issueType, issue_field: issueField } = req.params
  const { entity_count: entityCount } = entityCountRow ?? { entity_count: 0 }

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
const getIssueDetails = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/issueDetails.html',
  handlerName: 'getIssueDetails'
})

const isResourceIdInParams = ({ params }) => !('resourceId' in params)

const takeResourceIdFromParams = (req) => {
  logger.debug('skipping resource fetch', { type: types.App, params: req.params })
  req.resource = { resource: req.params.resourceId }
}

const getGetStartedMiddleware = [
  fetchOrgInfo,
  fetchDatasetInfo,
  getGetStarted,
  logPageError
]

const getDatasetOverviewMiddleware = [fetchOrgInfo, fetchDatasetInfo, fetchDatasetGeometries, fetchDatasetStats, getDatasetOverview, logPageError]

const getOverviewMiddleware = [
  fetchOrgInfo,
  fetchLpaOverview,
  prepareOverviewTemplateParams,
  getOverview,
  logPageError
]

const getIssueDetailsMiddleware = [
  validateIssueDetailsQueryParams,
  parallel([
    fetchOrgInfo,
    fetchDatasetInfo
  ]),
  fetchIf(isResourceIdInParams, fetchLatestResource, takeResourceIdFromParams),
  fetchIssues,
  reformatIssuesToBeByEntryNumber,
  parallel([
    fetchEntry,
    fetchEntityCount,
    fetchIssueEntitiesCount
  ]),
  prepareIssueDetailsTemplateParams,
  getIssueDetails,
  logPageError
]

const fetchOrganisations = fetchMany({
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
  const sortedResults = req.organisations.sort((a, b) => {
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

const getOrganisations = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/find.html',
  handlerName: 'getOrganisations'
})

/**
 * Was the resource accessed successfully via HTTP?
 *
 * @param {*} req
 * @returns {boolean}
 */
const isResourceAccessible = (req) => req.resourceStatus.status === '200'
const isResourceNotAccessible = (req) => !isResourceAccessible(req)

const fetchLpaDatasetIssues = fetchMany({
  query: ({ params, req }) => performanceDbApi.datasetIssuesQuery(req.resourceStatus.resource, params.dataset),
  result: 'issues'
})

const onlyIf = (condition, middlewareFn) => {
  return async (req, res, next) => {
    if (condition(req)) {
      const result = middlewareFn(req, res, next)
      if (result instanceof Promise) {
        await result
      }
    } else {
      next()
    }
  }
}

/**
 * Middleware. Updates req with `templateParams`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns { { templateParams: object }}
 */
const prepareDatasetTaskListTemplateParams = (req, res, next) => {
  const { issues, entityCount: entityCountRow, params, dataset, orgInfo: organisation } = req
  const { entity_count: entityCount } = entityCountRow ?? { entity_count: 0 }
  const { lpa, dataset: datasetId } = params
  console.assert(req.resourceStatus.resource === req.resource.resource, 'mismatch between resourceStatus and resource data')
  console.assert(typeof entityCount === 'number', 'entityCount should be a number')

  const taskList = issues.map((issue) => {
    return {
      title: {
        text: performanceDbApi.getTaskMessage({ ...issue, entityCount, field: issue.field })
      },
      href: `/organisations/${lpa}/${datasetId}/${issue.issue_type}/${issue.field}`,
      status: getStatusTag(issue.status)
    }
  })

  req.templateParams = {
    taskList,
    organisation,
    dataset
  }

  next()
}

/**
 * Middleware. Updates req with `templateParams`
 *
 * @param {*} req
 * @param {*} res
 * @param {} next
 * @returns {{ templateParams: object }}
 */
const prepareDatasetTaskListErrorTemplateParams = (req, res, next) => {
  const { orgInfo: organisation, dataset, resourceStatus: resource } = req

  const daysSince200 = resource.days_since_200
  const today = new Date()
  const last200Date = new Date(
    today.getTime() - daysSince200 * 24 * 60 * 60 * 1000
  )
  const last200Datetime = last200Date.toISOString().slice(0, 19) + 'Z'

  req.templateParams = {
    organisation,
    dataset,
    errorData: {
      endpoint_url: resource.endpoint_url,
      http_status: resource.status,
      latest_log_entry_date: resource.latest_log_entry_date,
      latest_200_date: last200Datetime
    }
  }

  next()
}

const getDatasetTaskList = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/datasetTaskList.html',
  handlerName: 'getDatasetTaskList'
})

const getDatasetTaskListError = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/http-error.html',
  handlerName: 'getDatasetTaskListError'
})

const getOrganisationsMiddleware = [
  fetchOrganisations,
  prepareGetOrganisationsTemplateParams,
  getOrganisations,
  logPageError
]

const getDatasetTaskListMiddleware = [
  fetchResourceStatus,
  parallel([
    fetchOrgInfoWithStatGeo,
    fetchDatasetInfo]),
  fetchIf(isResourceAccessible, fetchLatestResource),
  parallel([
    fetchIf(isResourceAccessible, fetchLpaDatasetIssues),
    fetchIf(isResourceAccessible, fetchEntityCount)
  ]),
  onlyIf(isResourceAccessible, prepareDatasetTaskListTemplateParams),
  onlyIf(isResourceAccessible, getDatasetTaskList),

  onlyIf(isResourceNotAccessible, prepareDatasetTaskListErrorTemplateParams),
  onlyIf(isResourceNotAccessible, getDatasetTaskListError),
  logPageError
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
  prepareDatasetTaskListErrorTemplateParams,
  prepareDatasetTaskListTemplateParams,
  getDatasetTaskListError,
  getDatasetTaskList,
  getDatasetTaskListMiddleware,

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
