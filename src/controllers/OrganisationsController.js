import getDatasetTaskListMiddleware from '../middleware/datasetTaskList.middleware.js'
import getDatasetOverviewMiddleware from '../middleware/datasetOverview.middleware.js'
import getIssueDetailsMiddleware from '../middleware/issueDetails.middleware.js'
import getIssueTableMiddleware from '../middleware/issueTable.middleware.js'
import getOrganisationsMiddleware from '../middleware/organisations.middleware.js'
import getGetStartedMiddleware from '../middleware/getStarted.middleware.js'
import getOverviewMiddleware from '../middleware/overview.middleware.js'
import getDatasetDataviewMiddleware from '../middleware/dataview.middleware.js'

const organisationsController = {
  getOrganisationsMiddleware,
  getDatasetTaskListMiddleware,
  getDatasetOverviewMiddleware,
  getIssueDetailsMiddleware,
  getIssueTableMiddleware,
  getGetStartedMiddleware,
  getOverviewMiddleware,
  getDatasetDataviewMiddleware
}

export default organisationsController
