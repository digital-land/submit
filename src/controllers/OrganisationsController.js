import getDatasetTaskListMiddleware from './datasetTasklist.middleware.js'
import getDatasetOverviewMiddleware from './datasetOverview.middleware.js'
import getIssueDetailsMiddleware from './issueDetails.middleware.js'
import getOrganisationsMiddleware from './organisations.middleware.js'
import getStartedMiddleware from './started.middleware.js'
import getOverviewMiddleware from './overview.middleware.js'

const organisationsController = {
  getOrganisationsMiddleware,
  getDatasetTaskListMiddleware,
  getDatasetOverviewMiddleware,
  getIssueDetailsMiddleware,
  getStartedMiddleware,
  getOverviewMiddleware
}

export default organisationsController
