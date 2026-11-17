import * as v from 'valibot'
import {
  fetchDatasetInfo,
  getDatasetTaskListError,
  validateOrgAndDatasetQueryParams, validateQueryParams
} from './common.middleware.js'
import { fetchOne, renderTemplate } from './middleware.builders.js'
import '../types/datasette.js'

const fetchOrgInfoWithStatGeo = fetchOne({
  query: ({ params }) => {
    return /* sql */ `SELECT name, organisation, statistical_geography FROM organisation WHERE organisation = '${params.lpa}'`
  },
  result: 'orgInfo'
})

const fetchSourceByEndpoint = fetchOne({
  query: ({ params }) => {
    return /* sql */ `
        SELECT
            rhe.endpoint,
            rhe.endpoint_url,
            rhe.status,
            rhe.exception,
            rhe.latest_log_entry_date,
            rle.days_since_200
        FROM
            reporting_historic_endpoints rhe
            LEFT JOIN reporting_latest_endpoints rle 
                ON rhe.endpoint = rle.endpoint
        WHERE 
            rhe.endpoint = '${params.endpoint}'
        ORDER BY
            rhe.latest_log_entry_date DESC
        LIMIT 1`
  },
  result: 'source'
})

/**
 *
 * @param { { orgInfo: OrgInfo, dataset: DatasetInfo, source: Source, now: Date }} req
 * @param res
 * @param next
 */
export const prepareDatasetEndpointIssueTemplateParams = (req, res, next) => {
  const { orgInfo: organisation, dataset, source, now } = req

  /** @type {number|null} */
  const daysSince200 = source.days_since_200
  /** @type {String|null} */
  let last200Datetime = null
  if (Number.isSafeInteger(daysSince200) && daysSince200 >= 0) {
    const last200Date = new Date((now || new Date()).getTime() - daysSince200 * 24 * 60 * 60 * 1000)
    last200Datetime = last200Date.toISOString().split('T')[0]
  }

  req.templateParams = {
    organisation,
    dataset,
    errorData: {
      endpoint_url: source.endpoint_url,
      http_status: source.status,
      latest_log_entry_date: source.latest_log_entry_date,
      latest_200_date: last200Datetime
    }
  }

  next()
}

const validateEndpointQueryParam = validateQueryParams({
  schema: v.object({
    endpoint: v.pipe(v.string(), v.minLength(1))
  })
})

const getDatasetTaskList403Error = renderTemplate({
  templateParams: (req) => ({
    err: {
      message: 'We cannot access your endpoint URL',
      errorDetail: { errCode: '403' },
      organisationId: req.orgInfo.organisation,
      organisationName: req.orgInfo.name
    }
  }),
  template: 'check/error-redirect.html',
  handlerName: 'getDatasetTaskList403Error'
})

export const renderDatasetEndpointIssueError = (req, res, next) => {
  if (String(req.source.status) === '403') {
    req.session.ipInformation = {
      organisationId: req.orgInfo.organisation,
      organisationName: req.orgInfo.name
    }
    return getDatasetTaskList403Error(req, res, next)
  }

  return getDatasetTaskListError(req, res, next)
}

export default [
  validateOrgAndDatasetQueryParams,
  validateEndpointQueryParam,
  fetchOrgInfoWithStatGeo,
  fetchDatasetInfo,
  fetchSourceByEndpoint,
  prepareDatasetEndpointIssueTemplateParams,
  renderDatasetEndpointIssueError
]
