import {
  addEntityCountsToResources,
  fetchDatasetInfo,
  fetchEntityIssueCounts,
  fetchEntryIssueCounts,
  fetchOrgInfo, fetchResources, fetchSources,
  logPageError,
  processEntitiesMiddlewares,
  validateOrgAndDatasetQueryParams
} from './common.middleware.js'
import { fetchOne, renderTemplate } from './middleware.builders.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { statusToTagClass } from '../filters/filters.js'
import '../types/datasette.js'
import logger from '../utils/logger.js'

/**
 * Fetches the resource status
 */
export const fetchResourceStatus = fetchOne({
  query: ({ params }) => performanceDbApi.resourceStatusQuery(params.lpa, params.dataset),
  result: 'resourceStatus'
})

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

const SPECIAL_ISSUE_TYPES = ['reference values are not unique']

/**
 * Prepares the task list for the dataset task list page
 *
 * This function takes the request, response, and next middleware function as arguments
 * and uses the parsed request parameters, entities, resources, and entry/ entity issue counts
 * to generate a list of tasks based on the issues found in the dataset
 *
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 * @return {undefined}
 */
export const prepareTasks = (req, res, next) => {
  const { lpa, dataset } = req.parsedParams
  const { entities, resources, sources } = req
  const { entryIssueCounts, entityIssueCounts } = req

  const entityCount = entities.length
  let issues = [...entryIssueCounts, ...entityIssueCounts]

  issues = issues.filter(
    issue => issue.issue_type !== '' &&
    issue.issue_type !== undefined &&
    issue.field !== '' &&
    issue.field !== undefined
  )

  const taskList = Object.values(issues).map(({ field, issue_type: type, count }) => {
    // if the issue doesn't have an entity, or is one of the special case issue types then we should use the resource_row_count

    let rowCount = entityCount
    if (SPECIAL_ISSUE_TYPES.includes(type)) {
      if (resources.length > 0) {
        rowCount = resources[0].entry_count
      } else {
        rowCount = 0
      }
    }

    let title
    try {
      title = performanceDbApi.getTaskMessage({ num_issues: count, rowCount, field, issue_type: type })
    } catch (e) {
      logger.warn('datasetTaskList::prepareTasks could not get task title so setting to default', { error: e, params: { num_issues: count, rowCount, field, issue_type: type } })
      title = `${count} issue${count > 1 ? 's' : ''} of type ${type}`
    }

    return {
      title: {
        text: title
      },
      href: `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(dataset)}/${encodeURIComponent(type)}/${encodeURIComponent(field)}`,
      status: getStatusTag('Needs fixing')
    }
  })

  // include sources which couldn't be accessed
  for (const source of sources) {
    if (!source.status || source.status >= 300) {
      taskList.push({
        title: {
          text: 'There was an error accessing the URL'
        },
        href: `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(dataset)}/endpoint-error/${encodeURIComponent(source.endpoint)}`,
        status: getStatusTag('Error')
      })
    }
  }

  req.taskList = taskList

  next()
}

/**
 * Middleware. Updates req with `templateParams`
 *
 * @param {{ orgInfo: OrgInfo, sources: Source[], entityCountRow: undefined | { entity_count: number}, issues: Issue[] }} req
 * @param {*} res
 * @param {*} next
 * @returns { { templateParams: object }}
 */
export const prepareDatasetTaskListTemplateParams = (req, res, next) => {
  const { taskList, dataset, orgInfo: organisation } = req

  req.templateParams = {
    taskList,
    organisation,
    dataset
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
  fetchSources,
  fetchDatasetInfo,
  fetchResources,
  addEntityCountsToResources,
  ...processEntitiesMiddlewares,
  fetchEntityIssueCounts,
  fetchEntryIssueCounts,
  prepareTasks,
  prepareDatasetTaskListTemplateParams,
  getDatasetTaskList,
  logPageError
]
