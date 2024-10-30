import { fetchDatasetInfo, fetchEntityCount, logPageError, validateQueryParams, fetchResources } from './common.middleware.js'
import { fetchOne, renderTemplate, fetchMany } from './middleware.builders.js'
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

const fetchOrgInfoWithStatGeo = fetchOne({
  query: ({ params }) => {
    return /* sql */ `SELECT name, organisation, statistical_geography, entity FROM organisation WHERE organisation = '${params.lpa}'`
  },
  result: 'orgInfo'
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
 * Middleware. Updates req with `templateParams`
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns { { templateParams: object }}
 */
export const prepareDatasetTaskListTemplateParams = (req, res, next) => {
  const { entityCount: entityCountRow, params, dataset, orgInfo: organisation, tasks } = req
  const { entity_count: entityCount } = entityCountRow ?? { entity_count: 0 }
  const { lpa, dataset: datasetId } = params

  console.assert(typeof entityCount === 'number', 'entityCount should be a number')

  const taskList = tasks.reduce((acc, task) => {
    const { resource } = task
    const taskItem = {
      title: {
        text: performanceDbApi.getTaskMessage({ ...task, entityCount, field: task.field, resource: task.resource })
      },
      href: `/organisations/${lpa}/${datasetId}/${task.resource}/${task.issue_type}/${task.field}`,
      status: getStatusTag(task.status)
    }
    if (!acc[resource]) acc[resource] = []
    acc[resource].push(taskItem)
    return acc
  }, {})

  const taskList2D = Object.entries(taskList).map(([resource, tasks]) => ({ resource, tasks }))

  req.templateParams = {
    taskList: taskList2D,
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

export const fetchLpaDatasetTasks = fetchMany({
  query: ({ req, params }) => `
    SELECT
      i.field,
      i.issue_type,
      i.line_number,
      i.value,
      i.message,
      i.resource,
      CASE
        WHEN COUNT(
          CASE
            WHEN it.severity == 'error' THEN 1
            ELSE null
          END
        ) > 0 THEN 'Needs fixing'
        ELSE 'Live'
      END AS status,
      COUNT(i.issue_type) as num_issues
    FROM
        issue i
    LEFT JOIN
      issue_type it ON i.issue_type = it.issue_type
    WHERE
        i.resource in ('${req.resources.map(resource => resource.resource).join("', '")}')
        AND i.dataset = '${params.dataset}'
        AND (it.severity == 'error')
    GROUP BY i.issue_type, i.field, i.resource
    ORDER BY it.severity`,
  result: 'tasks'
})

export default [
  validateParams,
  fetchResourceStatus,
  fetchOrgInfoWithStatGeo,
  fetchDatasetInfo,
  fetchResources,
  fetchLpaDatasetTasks,
  fetchEntityCount,
  prepareDatasetTaskListTemplateParams,
  getDatasetTaskList,
  logPageError
]
