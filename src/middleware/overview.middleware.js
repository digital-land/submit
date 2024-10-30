import { fetchOrgInfo, logPageError } from './common.middleware.js'
import { fetchMany, FetchOptions, renderTemplate } from './middleware.builders.js'
import { dataSubjects } from '../utils/utils.js'
import _ from 'lodash'

// get a list of available datasets
const availableDatasets = Object.values(dataSubjects).flatMap((dataSubject) =>
  dataSubject.dataSets
    .filter((dataset) => dataset.available)
    .map((dataset) => dataset.value)
)

/**
 * For the purpose of displaying single status label on (possibly) many issues,
 * we want issues with 'worse' status to be weighted higher.
 */
const statusOrdering = new Map(['Live', 'Needs fixing', 'Error', 'Not submitted'].map((status, i) => [status, i]))

/**
 * The overview data can contain multiple rows per dataset,
 * and we want a collection of with one item per dataset,
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
  if (dataset.active_endpoint_count > 0) accumulator[0]++
  if (dataset.status === 'Error') accumulator[2]++
  if (dataset.error_endpoint_count > 0) accumulator[2]++
  return accumulator
}

export function prepareOverviewTemplateParams (req, res, next) {
  const { provisionSummary, orgInfo: organisation } = req

  // filter down to only the ones we want
  const datasets = provisionSummary.filter(dataset => availableDatasets.includes(dataset.dataset))

  // add in any datasets that they the performance db doesn't have
  const keys = new Set(datasets.map(d => d.dataset))
  availableDatasets.forEach((dataset) => {
    if (!keys.has(dataset)) {
      datasets.push({
        dataset,
        active_endpoint_count: 0,
        error_endpoint_count: 0,
        count_issue_error_internal: 0,
        count_issue_error_external: 0,
        count_issue_warning_internal: 0,
        count_issue_warning_external: 0,
        count_issue_notice_internal: 0,
        count_issue_notice_external: 0
      })
    }
  })

  // re-sort the datasets to be in alphabetical order
  datasets.sort((a, b) => a.dataset.localeCompare(b.dataset))

  // add status's to the dataset
  const datasetsWithStatus = datasets.map(dataset => {
    const datasetWithStatus = { ...dataset }

    if (dataset.error_endpoint_count > 0) {
      datasetWithStatus.status = 'Error'
    } else if (dataset.count_issue_error_external > 0) {
      datasetWithStatus.status = 'Needs fixing'
    } else if (dataset.active_endpoint_count > 0) {
      datasetWithStatus.status = 'Live'
    } else {
      datasetWithStatus.status = 'Not submitted'
    }
    return datasetWithStatus
  })

  const totalDatasets = datasets.length
  const [datasetsWithEndpoints, datasetsWithIssues, datasetsWithErrors] = datasets.reduce(orgStatsReducer, [0, 0, 0])

  req.templateParams = {
    organisation,
    datasets: datasetsWithStatus,
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

export const fetchProvisionSummary = fetchMany({
  query: ({ req, params }) => `select * from provision_summary where REPLACE(organisation, '-eng', '') = "${params.lpa}"`,
  dataset: FetchOptions.performanceDb,
  result: 'provisionSummary'
})

/*
  Notes on how this middleware needs to change:

*/

export default [
  fetchOrgInfo,
  fetchProvisionSummary,
  prepareOverviewTemplateParams,
  getOverview,
  logPageError
]
