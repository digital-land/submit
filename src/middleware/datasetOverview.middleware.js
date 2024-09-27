import { fetchDatasetInfo, fetchLatestResource, fetchLpaDatasetIssues, fetchOrgInfo, isResourceAccessible, isResourceIdInParams, logPageError, takeResourceIdFromParams } from './common.middleware.js'
import { fetchIf, parallel, renderTemplate } from './middleware.builders.js'
import { getDatasetStats } from '../services/DatasetService.js'
import { fetchResourceStatus } from './datasetTaskList.middleware.js'

const fetchDatasetStats = async (req, res, next) => {
  req.stats = await getDatasetStats(req.params.dataset, req.params.lpa)

  next()
}

const getDatasetOverview = renderTemplate(
  {
    templateParams (req) {
      const { orgInfo: organisation, dataset, stats, issues } = req
      return { organisation, dataset, stats, issueCount: issues.length }
    },
    template: 'organisations/dataset-overview.html',
    handlerName: 'datasetOverview'
  }
)

export default [
  parallel([
    fetchOrgInfo,
    fetchDatasetInfo
  ]),
  fetchResourceStatus,
  fetchIf(isResourceIdInParams, fetchLatestResource, takeResourceIdFromParams),
  fetchIf(isResourceAccessible, fetchLpaDatasetIssues),
  fetchDatasetStats,
  getDatasetOverview,
  logPageError
]
