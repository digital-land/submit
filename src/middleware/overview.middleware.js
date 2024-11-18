import performanceDbApi, { lpaOverviewQuery } from '../services/performanceDbApi.js'
import { fetchOrgInfo, logPageError } from './common.middleware.js'
import { fetchMany, FetchOptions, handleRejections, renderTemplate } from './middleware.builders.js'
import { dataSubjects } from '../utils/utils.js'
import config from '../../config/index.js'
import _ from 'lodash'

// get a list of available datasets
const availableDatasets = Object.values(dataSubjects).flatMap((dataSubject) =>
  dataSubject.dataSets
    .filter((dataset) => dataset.available)
    .map((dataset) => dataset.value)
)

/**
 * Middleware. Updates req with 'lpaOverview'
 *
 * Relies on {@link config}.
 *
 * @param {{ params: { lpa: string }, entityCounts: { dataset: string, resource: string, entityCount?: number }[]}} req
 */
const fetchLpaOverview = fetchMany({
  query: ({ req, params }) => {
    return lpaOverviewQuery(params.lpa, { datasetsFilter: Object.keys(config.datasetsConfig), entityCounts: req.entityCounts })
  },
  dataset: FetchOptions.performanceDb,
  result: 'lpaOverview'
})

const fetchLatestResources = fetchMany({
  query: ({ params }) => {
    return performanceDbApi.latestResourcesQuery(params.lpa, { datasetsFilter: Object.keys(config.datasetsConfig) })
  },
  result: 'resourceLookup',
  dataset: FetchOptions.performanceDb
})

const fetchProvisions = fetchMany({
  query: ({ params }) => {
    const excludeDatasets = config.datasetsFilter.map(dataset => `'${dataset}'`).join(',')
    return /* sql */ `select dataset, project, provision_reason 
       from provision where organisation = '${params.lpa}' and dataset in (${excludeDatasets})`
  },
  result: 'provisions'
})

/**
 * Updates req with `entityCounts` (of shape `{ resource, dataset}|{ resource, dataset, entityCount }`)
 *
 * @param {{ resourceLookup: {resource: string, dataset: string}[] }} req
 * @param {*} res
 * @param {*} next
 */
const fetchEntityCounts = async (req, res, next) => {
  const { resourceLookup } = req

  req.entityCounts = await performanceDbApi.getEntityCounts(resourceLookup)
  next()
}

/**
 * For the purpose of displaying single status label on (possibly) many issues,
 * we want issues with 'worse' status to be weighted higher.
 */
const statusOrdering = new Map(['Live', 'Needs fixing', 'Error', 'Not submitted'].map((status, i) => [status, i]))

/**
 * The overview data can contain multiple rows per dataset,
 * and we want a collection of one item per dataset,
 * because that's how we display it on the page.
 *
 * @param {object[]} lpaOverview
 * @returns {object[]}
 */
export function aggregateOverviewData (lpaOverview) {
  if (!Array.isArray(lpaOverview)) {
    throw new Error('lpaOverview should be an array')
  }
  const grouped = _.groupBy(lpaOverview, 'dataset')
  const datasets = []
  for (const [dataset, rows] of Object.entries(grouped)) {
    let numIssues = 0
    for (const row of rows) {
      if (row.status !== 'Needs fixing') {
        continue
      }
      if (row.issue_count) {
        const numFields = (row.fields ?? '').split(',').length
        if (row.issue_count >= row.entity_count) numIssues += numFields
        else numIssues += row.issue_count
      }
    }
    const info = {
      slug: dataset,
      issue_count: numIssues,
      endpoint: rows[0].endpoint,
      error: rows[0].error,
      status: _.maxBy(rows, row => statusOrdering.get(row.status)).status
    }
    datasets.push(info)
  }
  return datasets
}

/**
 * Calculates overall "health" of the datasets (not)provided by an organisation.
 *
 * @param {[number, number, number]} accumulator
 * @param {{ endpoint?: string, status: string }} dataset
 * @returns
 */
const orgStatsReducer = (accumulator, dataset) => {
  if (dataset.endpoint) accumulator[0]++
  if (dataset.status === 'Needs fixing') accumulator[1]++
  if (dataset.status === 'Error') accumulator[2]++
  return accumulator
}

/**
 *
 * @param {{ provisions: { dataset: string, provision_reason: string, project: string }[], lpaOverview: Object, orgInfo: Object }} req
 * @param res
 * @param next
 */
export function prepareOverviewTemplateParams (req, res, next) {
  const { lpaOverview, orgInfo: organisation, provisions } = req
  const datasets = aggregateOverviewData(lpaOverview)
  // add in any of the missing key 8 datasets
  const keys = new Set(datasets.map(d => d.slug))
  availableDatasets.forEach((dataset) => {
    if (!keys.has(dataset)) {
      const row = {
        slug: dataset,
        endpoint: null,
        status: 'Not submitted',
        issue_count: 0,
        entity_count: undefined
      }
      datasets.push(row)
    }
  })

  const totalDatasets = datasets.length
  const [datasetsWithEndpoints, datasetsWithIssues, datasetsWithErrors] =
      datasets.reduce(orgStatsReducer, [0, 0, 0])

  const provisionData = new Map()
  for (const provision of provisions ?? []) {
    provisionData.set(provision.dataset, provision)
  }

  for (const dataset of datasets) {
    dataset.project = provisionData.get(dataset.slug)?.project
  }

  const datasetsByReason = _.groupBy(datasets, (ds) => {
    const reason = provisionData.get(ds.slug)?.provision_reason
    switch (reason) {
      case 'statutory':
        return 'statutory'
      default:
        return 'other'
    }
  })

  for (const coll of Object.values(datasetsByReason)) {
    coll.sort((a, b) => a.slug.localeCompare(b.slug))
  }

  req.templateParams = {
    organisation,
    datasets: datasetsByReason,
    totalDatasets,
    datasetsWithEndpoints,
    datasetsWithIssues,
    datasetsWithErrors
  }

  next()
}

export const getOverview = renderTemplate({
  templateParams (req) {
    if (!req.templateParams) throw new Error('missing templateParams')
    return req.templateParams
  },
  template: 'organisations/overview.html',
  handlerName: 'getOverview'
})

export default [
  fetchOrgInfo,
  fetchLatestResources,
  handleRejections(fetchEntityCounts),
  fetchLpaOverview,
  fetchProvisions,
  prepareOverviewTemplateParams,
  getOverview,
  logPageError
]
