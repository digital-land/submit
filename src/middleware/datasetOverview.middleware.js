import { fetchDatasetInfo, fetchOrgInfo, logPageError } from './common.middleware.js'
import { renderTemplate } from './middleware.builders.js'
import { getDatasetStats } from '../services/DatasetService.js'

const fetchDatasetStats = async (req, res, next) => {
  req.stats = await getDatasetStats({
    lpa: req.params.lpa,
    dataset: req.params.dataset,
    organisation: req.orgInfo
  })
  next()
}

const getDatasetOverview = renderTemplate(
  {
    templateParams (req) {
      const { orgInfo: organisation, dataset, stats } = req
      return { organisation, dataset, stats }
    },
    template: 'organisations/dataset-overview.html',
    handlerName: 'datasetOverview'
  }
)

export default [
  fetchOrgInfo,
  fetchDatasetInfo,
  fetchDatasetStats,
  getDatasetOverview,
  logPageError
]