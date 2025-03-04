import datasetTaskListMiddleware from '../middleware/datasetTaskList.middleware.js'
import datasetOverviewMiddleware from '../middleware/datasetOverview.middleware.js'
import entityIssueDetailsMiddleware from '../middleware/entityIssueDetails.middleware.js'
import entryIssueDetailsMiddleware from '../middleware/entryIssueDetails.middleware.js'
import issueTableMiddleware from '../middleware/issueTable.middleware.js'
import organisationsMiddleware from '../middleware/organisations.middleware.js'
import getStartedMiddleware from '../middleware/getStarted.middleware.js'
import overviewMiddleware from '../middleware/lpa-overview.middleware.js'
import datasetDataviewMiddleware from '../middleware/dataview.middleware.js'
import datasetEndpointIssueMiddleware from '../middleware/datasetEndpointIssue.middleware.js'

const organisationsController = {
  organisationsMiddleware,
  datasetTaskListMiddleware,
  datasetOverviewMiddleware,
  entityIssueDetailsMiddleware,
  entryIssueDetailsMiddleware,
  issueTableMiddleware,
  getStartedMiddleware,
  overviewMiddleware,
  datasetDataviewMiddleware,
  datasetEndpointIssueMiddleware
}

export default organisationsController
