import DatasetTaskListMiddleware from '../middleware/datasetTaskList.middleware.js'
import DatasetOverviewMiddleware from '../middleware/datasetOverview.middleware.js'
import IssueDetailsMiddleware from '../middleware/issueDetails.middleware.js'
import IssueTableMiddleware from '../middleware/issueTable.middleware.js'
import OrganisationsMiddleware from '../middleware/organisations.middleware.js'
import GetStartedMiddleware from '../middleware/getStarted.middleware.js'
import OverviewMiddleware from '../middleware/overview.middleware.js'
import DatasetDataviewMiddleware from '../middleware/dataview.middleware.js'

const organisationsController = {
  OrganisationsMiddleware,
  DatasetTaskListMiddleware,
  DatasetOverviewMiddleware,
  IssueDetailsMiddleware,
  IssueTableMiddleware,
  GetStartedMiddleware,
  OverviewMiddleware,
  DatasetDataviewMiddleware
}

export default organisationsController
