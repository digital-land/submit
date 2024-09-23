import { fetchDatasetInfo, isResourceAccessible, isResourceNotAccessible, fetchLatestResource, fetchEntityCount, logPageError } from './common.middleware.js'
import { parallel, fetchOne, fetchIf, fetchMany, onlyIf, renderTemplate } from './middleware.builders.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { statusToTagClass } from '../filters/filters.js'

/**
 * Fetches the resource status
 */
export const fetchResourceStatus = fetchOne({
  query: ({ params }) => performanceDbApi.resourceStatusQuery(params.lpa, params.dataset),
  result: 'resourceStatus'
})

const fetchOrgInfoWithStatGeo = fetchOne({
  query: ({ params }) => {
    return /* sql */ `SELECT name, organisation, statistical_geography FROM organisation WHERE organisation = '${params.lpa}'`
  },
  result: 'orgInfo'
})

const fetchLpaDatasetIssues = fetchMany({
  query: ({ params, req }) => performanceDbApi.datasetIssuesQuery(req.resourceStatus.resource, params.dataset),
  result: 'issues'
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

const getDatasetTaskListError = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/http-error.html',
  handlerName: 'getDatasetTaskListError'
})

export default [
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
