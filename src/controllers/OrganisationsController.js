import datasetTaskListMiddleware from '../middleware/datasetTaskList.middleware.js'
import datasetOverviewMiddleware from '../middleware/datasetOverview.middleware.js'
import entityIssueDetailsMiddleware from '../middleware/entityIssueDetails.middleware.js'
import issueTableMiddleware from '../middleware/issueTable.middleware.js'
import organisationsMiddleware from '../middleware/organisations.middleware.js'
import getStartedMiddleware from '../middleware/getStarted.middleware.js'
import overviewMiddleware from '../middleware/overview.middleware.js'
import datasetDataviewMiddleware from '../middleware/dataview.middleware.js'

const organisationsController = {
  organisationsMiddleware,
  datasetTaskListMiddleware,
  datasetOverviewMiddleware,
  entityIssueDetailsMiddleware,
  issueTableMiddleware,
  getStartedMiddleware,
  overviewMiddleware,
  datasetDataviewMiddleware
}

export default organisationsController
