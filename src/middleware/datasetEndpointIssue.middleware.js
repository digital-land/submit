import * as v from 'valibot'
import {
  fetchDatasetInfo,
  getDatasetTaskListError,
  validateOrgAndDatasetQueryParams, validateQueryParams
} from './common.middleware.js'
import { fetchOne } from './middleware.builders.js'

/** @typedef {import('../types/datasette')} Types */

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
 * @param { { orgInfo: Types.OrgInfo, dataset: Types.DatasetInfo, source: Types.Source }} req
 * @param res
 * @param next
 */
export const prepareDatasetEndpointIssueTemplateParams = (req, res, next) => {
  const { orgInfo: organisation, dataset, source } = req

  const today = new Date()

  /** @type {number|null} */
  const daysSince200 = source.days_since_200
  /** @type {String|null} */
  let last200Datetime = null
  if (Number.isSafeInteger(daysSince200) && daysSince200 >= 0) {
    const last200Date = new Date(today.getTime() - daysSince200 * 24 * 60 * 60 * 1000)
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

export default [
  validateOrgAndDatasetQueryParams,
  validateEndpointQueryParam,
  fetchOrgInfoWithStatGeo,
  fetchDatasetInfo,
  fetchSourceByEndpoint,
  prepareDatasetEndpointIssueTemplateParams,
  getDatasetTaskListError
]
