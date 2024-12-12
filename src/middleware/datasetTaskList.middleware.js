import {
  fetchDatasetInfo,
  validateQueryParams,
  fetchResources,
  processEntitiesMiddlewares,
  fetchOrgInfo,
  fetchEntityIssueCounts,
  fetchEntryIssueCounts,
  logPageError,
  addEntityCountsToResources
} from './common.middleware.js'
import { fetchOne, renderTemplate } from './middleware.builders.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { statusToTagClass } from '../filters/filters.js'
import * as v from 'valibot'

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
  const { entities, resources } = req
  const { entryIssueCounts, entityIssueCounts } = req

  const entityCount = entities.length

  const specialIssueTypeCases = ['reference values are not unique']

  const issues = [...entryIssueCounts, ...entityIssueCounts]

  req.taskList = Object.values(issues).map(({ field, issue_type: type, count }) => {
    // if the issue doesn't have an entity, or is one of the special case issue types then we should use the resource_row_count

    let rowCount = entityCount
    if (specialIssueTypeCases.includes(type)) {
      rowCount = resources[0].entry_count
    }

    return {
      title: {
        text: performanceDbApi.getTaskMessage({ num_issues: count, rowCount, field, issue_type: type })
      },
      href: `/organisations/${lpa}/${dataset}/${type}/${field}`,
      status: getStatusTag('Needs fixing')
    }
  })

  next()
}

/**
 * Middleware. Updates req with `templateParams`
 *
 * @param {*} req
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

/**
 * Middleware. Updates req with `templateParams`
 *
 * @param {*} req
 * @param {*} res
 * @param {} next
 * @returns {{ templateParams: object }}
 */
export const prepareDatasetTaskListErrorTemplateParams = (req, res, next) => {
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

const validateParams = validateQueryParams({
  schema: v.object({
    lpa: v.string(),
    dataset: v.string()
  })
})

export default [
  validateParams,
  fetchOrgInfo,
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
