/**
 * @module middleware-dataset-tasklist
 *
 * @description Middleware responsible for assembling and presenting a dataset's task list.
 *
 * The notion of "tasks" used here means some actions that an LPA needs to take to improve
 * the quality of the data.
 *
 * A task is added to the list when:
 * - data ingestion pipeline has problems accessing the endpoint URL (this happens outside of this application)
 * - data ingestion pipeline found issues with the data (again, happnes outside of this application,
 *   but we can query the results in datasette)
 * - an 'expectation' failed (happens outside this application, but we can query the results)
 */

import {
  addEntityCountsToResources,
  expectationFetcher,
  expectations,
  fetchDatasetInfo,
  fetchEntityCount,
  fetchTasksFromPlatformApi,
  fetchLocalPlanningGroups,
  fetchProvisionsByOrgsAndDatasets,
  fetchOrgInfo, fetchResources, fetchSources,
  logPageError,
  noop,
  validateOrgAndDatasetQueryParams,
  prepareAuthority
} from './common.middleware.js'
import { fetchOne, renderTemplate } from './middleware.builders.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { statusToTagClass } from '../filters/filters.js'
import '../types/datasette.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'
import { isFeatureEnabled } from '../utils/features.js'
import config from '../../config/index.js'
import pluralize from 'pluralize'
import { currentDatasetTasks, hasEndpointError, sourceForTask, taskPath } from '../utils/datasetTasks.js'

/**
 * Fetches the resource status
 */
export const fetchResourceStatus = fetchOne({
  query: ({ params }) => performanceDbApi.resourceStatusQuery(params.lpa, params.dataset),
  result: 'resourceStatus'
})

const fetchOutOfBoundsExpectations = expectationFetcher({
  expectation: expectations.entitiesOutOfBounds,
  includeDetails: true,
  result: 'expectationOutOfBounds'
})

/**
 * Returns a status tag object with a text label and a CSS class based on the status.
 *
 * @param {string} status - The status to generate a tag for (e.g. "Error", "Needs improving", etc.)
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

const SPECIAL_ISSUE_TYPES = ['reference values are not unique']

/**
 * Returns a task message for failed entity out of bounds expectation.
 * @param {string} dataset dataset slug
 * @param {number} count how many entities out of bounds were found
 * @returns {string} task message
 */
export function entityOutOfBoundsMessage (dataset, count) {
  const displayNameConfig = config.datasetsConfig[dataset]?.entityDisplayName ?? { variable: 'entity', base: '' }
  // if count is missing for some reason, we don't display it and default to plural form
  const displayName = `${displayNameConfig.base ?? ''} ${pluralize(displayNameConfig.variable, count ?? 2, false)}`.trim()
  return `You have ${count ?? ''} ${displayName} outside of your boundary`.replace(/ {2}/, ' ')
}

/**
 * Generates a list of tasks based on the issues found in the dataset.
 *
 * @param {Object} req The request object. It should contain the following properties:
 * @param {Object} req.parsedParams An object containing the parameters of the request
 * @param {string} req.parsedParams.lpa The LPA (Local Planning Authority) associated with the request.
 * @param {string} req.parsedParams.dataset The name of the dataset associated with the request.
 * @param {Object} req.entityCount total entity count under `count` field
 * @param {Object[]} req.resources: An array of resource objects.
 * @param {Object[]} req.sources: An array of source objects.
 * @param {Object} req.entryIssueCounts: An object containing the issue counts for the entries in the dataset.
 * @param {Object} req.entityIssueCounts: An object containing the issue counts for the entities in the dataset.
 * @param {Object[]} [req.expectationOutOfBounds]
 * @param {string} req.expectationOutOfBounds[].dataset
 * @param {boolean} req.expectationOutOfBounds[].passed did the exepectation pass
 * @param {number} req.expectationOutOfBounds[].expected
 * @param {number} req.expectationOutOfBounds[].actual
 * @param {Object} req.taskList OUT value
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {undefined}
 */
export const prepareTasks = (req, res, next) => {
  const { lpa, dataset } = req.parsedParams
  const { entityCount, resources, sources, authority } = req
  const { tasks: tasksData = { tasks: [] }, expectationOutOfBounds = [] } = req

  // First check, if non authoritative dataset, only one task to show: Provide authoritative data
  if (authority && authority === 'some') {
    req.taskList = [{
      title: {
        text: 'Provide authoritative data'
      },
      href: `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(dataset)}/get-started`,
      status: getStatusTag('Needs improving')
    }]
    return next()
  }

  const endpointTaskLists = [...sources]
    .sort((a, b) => (Date.parse(b.endpoint_entry_date) || 0) - (Date.parse(a.endpoint_entry_date) || 0))
    .map((source, index) => ({
      endpoint: source.endpoint,
      endpointUrl: source.endpoint_url,
      endpointNumber: sources.length - index,
      taskList: []
    }))
  const datasetTasks = []
  const taskList = currentDatasetTasks({ tasks: tasksData, sources })
    .map(task => {
      const { issue_type: type, field, count } = task.details
      const source = sourceForTask(task, sources)
      const resource = source && resources.find(resource => resource.resource === source.resource)

      let rowCount = source ? resource?.entry_count : entityCount?.count
      if (!source && SPECIAL_ISSUE_TYPES.includes(type)) {
        rowCount = resources.length > 0 ? resources[0].entry_count : 0
      }

      let title
      try {
        title = performanceDbApi.getTaskMessage({ num_issues: count, rowCount, field, issue_type: type, dataset })
      } catch (e) {
        logger.warn('Failed to generate task title', {
          type: types.App,
          errorMessage: e.message,
          errorStack: e.stack,
          params: { num_issues: count, rowCount, field, issue_type: type }
        })
        title = `${count} issue${count > 1 ? 's' : ''} of type ${type}`
      }

      const item = {
        title: { text: title },
        href: taskPath({ lpa, dataset, endpoint: source?.endpoint, resourceId: source?.resource, issue_type: type, issue_field: field }),
        status: getStatusTag('Needs improving')
      }
      if (source) endpointTaskLists.find(group => group.endpoint === source.endpoint).taskList.push(item)
      else datasetTasks.push(item)
      return item
    })

  // include sources which couldn't be accessed
  for (const source of sources) {
    if (hasEndpointError(source)) {
      const item = {
        title: {
          text: 'There was an error accessing the URL'
        },
        href: `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(dataset)}/endpoint-error/${encodeURIComponent(source.endpoint)}`,
        status: getStatusTag('Error')
      }
      taskList.push(item)
      endpointTaskLists.find(group => group.endpoint === source.endpoint).taskList.push(item)
    }
  }

  if (expectationOutOfBounds.length > 0) {
    const item = {
      title: {
        text: entityOutOfBoundsMessage(dataset, expectationOutOfBounds[0].actual)
      },
      href: `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(dataset)}/expectation/${encodeURIComponent(expectations.entitiesOutOfBounds.slug)}`,
      status: getStatusTag('Needs improving')
    }
    taskList.push(item)
    datasetTasks.push(item)
  }

  req.taskList = taskList
  req.endpointTaskLists = endpointTaskLists.filter(group => group.taskList.length > 0)
  req.datasetTasks = datasetTasks

  next()
}

/**
 * Middleware. Updates req with `templateParams`
 *
 * param {{ orgInfo: OrgInfo, sources: Source[], entityCountRow: undefined | { entity_count: number}, issues: Issue[] }} req
 * @param {Object} req request
 * @param {Object} req.orgInfo organisation info
 * @param {Object} req.dataset dataset info
 * @param {Object} req.sources sources
 * @param {Object} [req.entityCountRow] contains `{ entity_count: number }`
 * @param {Object[]} req.issues dataset issues
 * @param {Object[]} req.taskList task list
 * @param {Object} [req.templateParams] OUT param
 * @param {*} res
 * @param {*} next
 */
export const prepareDatasetTaskListTemplateParams = (req, res, next) => {
  const { taskList, dataset, orgInfo: organisation, authority, provisions } = req
  const planningGroupProvisions = provisions?.length > 1
    ? provisions.filter(p => p.organisation !== req.params.lpa)
    : []

  req.templateParams = {
    taskList,
    organisation,
    authority,
    dataset,
    planningGroupProvisions: planningGroupProvisions.length > 0 ? planningGroupProvisions : undefined
  }
  if (req.endpointTaskLists) {
    req.templateParams.endpointTaskLists = req.endpointTaskLists
    req.templateParams.datasetTasks = req.datasetTasks
  }
  next()
}

const getDatasetTaskList = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/datasetTaskList.html',
  handlerName: 'getDatasetTaskList'
})

export default [
  validateOrgAndDatasetQueryParams,
  fetchOrgInfo,
  fetchLocalPlanningGroups,
  fetchProvisionsByOrgsAndDatasets,
  fetchSources,
  fetchDatasetInfo,
  fetchResources,
  prepareAuthority,
  isFeatureEnabled('expectationOutOfBoundsTask') ? fetchOutOfBoundsExpectations : noop,
  addEntityCountsToResources,
  fetchEntityCount,
  fetchTasksFromPlatformApi,
  prepareTasks,
  prepareDatasetTaskListTemplateParams,
  getDatasetTaskList,
  logPageError
]
