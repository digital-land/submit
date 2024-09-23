import performanceDbApi from '../services/performanceDbApi.js'
import { fetchOrgInfo, logPageError } from './common.middleware.js'
import { renderTemplate } from './middleware.builders.js'
import { dataSubjects } from '../utils/utils.js'
import config from '../../config/index.js'

// get a list of available datasets
const availableDatasets = Object.values(dataSubjects).flatMap((dataSubject) =>
  dataSubject.dataSets
    .filter((dataset) => dataset.available)
    .map((dataset) => dataset.value)
)

/**
 * Middleware.
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns {Promise<*>}
 */
async function fetchLpaOverview (req, res, next) {
  const { datasetsFilter } = config
  try {
    const overview = await performanceDbApi.getLpaOverview(req.params.lpa, {
      datasetsFilter
    })
    req.lpaOverview = overview
    next()
  } catch (error) {
    next(error)
  }
}

function prepareOverviewTemplateParams (req, res, next) {
  const { lpaOverview, orgInfo: organisation } = req

  const datasets = Object.entries(lpaOverview.datasets).map(([key, value]) => {
    return {
      slug: key,
      ...value
    }
  })

  // add in any of the missing key 8 datasets
  const keys = Object.keys(lpaOverview.datasets)
  availableDatasets.forEach((dataset) => {
    if (!keys.includes(dataset)) {
      datasets.push({
        slug: dataset,
        endpoint: null,
        issue_count: 0,
        status: 'Not submitted'
      })
    }
  })

  // re-sort the datasets to be in alphabetical order
  datasets.sort((a, b) => a.slug.localeCompare(b.slug))

  const totalDatasets = datasets.length
  const [datasetsWithEndpoints, datasetsWithIssues, datasetsWithErrors] =
      datasets.reduce(
        (accumulator, dataset) => {
          if (dataset.endpoint) accumulator[0]++
          if (dataset.status === 'Needs fixing') accumulator[1]++
          if (dataset.status === 'Error') accumulator[2]++
          return accumulator
        },
        [0, 0, 0]
      )

  req.templateParams = {
    organisation,
    datasets,
    totalDatasets,
    datasetsWithEndpoints,
    datasetsWithIssues,
    datasetsWithErrors
  }

  next()
}

const getOverview = renderTemplate({
  templateParams (req) {
    if (!req.templateParams) throw new Error('missing templateParams')
    return req.templateParams
  },
  template: 'organisations/overview.html',
  handlerName: 'getOverview'
})

export default [
  fetchOrgInfo,
  fetchLpaOverview,
  prepareOverviewTemplateParams,
  getOverview,
  logPageError
]
