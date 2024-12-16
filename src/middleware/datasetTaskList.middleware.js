import {
  and,
  fetchDatasetInfo,
  fetchEntityCount,
  fetchLatestResource,
  fetchLpaDatasetIssues, fetchSources,
  isResourceAccessible,
  isResourceIdValid,
  logPageError,
  validateOrgAndDatasetQueryParams
} from './common.middleware.js'
import { fetchIf, fetchOne, renderTemplate } from './middleware.builders.js'
import performanceDbApi from '../services/performanceDbApi.js'
import { statusToTagClass } from '../filters/filters.js'

/** @typedef {import('../types/datasette')} Types */

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
 * @param {{ orgInfo: Types.OrgInfo, sources: Source[], entityCountRow: undefined | { entity_count: number}, issues: Issue[] }} req
 * @param {*} res
 * @param {*} next
 * @returns { { templateParams: object }}
 */
export const prepareDatasetTaskListTemplateParams = (req, res, next) => {
  const { issues, entityCount: entityCountRow, params, dataset, orgInfo: organisation, sources } = req
  const { entity_count: entityCount } = entityCountRow ?? { entity_count: 0 }
  const { lpa, dataset: datasetId } = params
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

  // include sources which couldn't be accessed
  for (const source of sources) {
    if (!source.status || source.status >= 300) {
      taskList.push({
        title: {
          text: 'There was an error accessing the URL'
        },
        href: `/organisations/${encodeURIComponent(lpa)}/${encodeURIComponent(datasetId)}/endpoint-error/${encodeURIComponent(source.endpoint)}`,
        status: getStatusTag('Error')
      })
    }
  }

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

/* eslint-disable-next-line no-return-assign */
const emptyIssuesList = (req) => req.issues = []

/* eslint-disable-next-line no-return-assign */
const zeroEntityCount = (req) => req.entityCount = { entity_count: 0 }

export default [
  validateOrgAndDatasetQueryParams,
  fetchResourceStatus,
  fetchSources,
  fetchOrgInfoWithStatGeo,
  fetchDatasetInfo,
  fetchIf(isResourceAccessible, fetchLatestResource),
  fetchIf(isResourceAccessible, fetchLpaDatasetIssues, emptyIssuesList),
  fetchIf(and(isResourceAccessible, isResourceIdValid), fetchEntityCount, zeroEntityCount),
  prepareDatasetTaskListTemplateParams,
  getDatasetTaskList,
  logPageError
]
