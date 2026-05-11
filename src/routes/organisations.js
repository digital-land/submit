import express from 'express'
import OrganisationsController from '../controllers/OrganisationsController.js'

const router = express.Router()

router.get('/:lpa/:dataset/get-started', OrganisationsController.getStartedMiddleware)
router.get('/:lpa/:dataset/overview', OrganisationsController.datasetOverviewMiddleware)
router.get('/:lpa/:dataset/endpoint-error/:endpoint', OrganisationsController.datasetEndpointIssueMiddleware)
router.get('/:lpa/:dataset/expectation/:expectation/entry', OrganisationsController.datasetFailedExpectationEntryMiddleware)
router.get('/:lpa/:dataset/expectation/:expectation/entity/:pageNumber?', OrganisationsController.datasetFailedExpectationIssueMiddleware)
router.get('/:lpa/:dataset/data/:pageNumber', OrganisationsController.datasetDataviewMiddleware)
router.get('/:lpa/:dataset/data', OrganisationsController.datasetDataviewMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field/entity/:pageNumber', OrganisationsController.entityIssueDetailsMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field/entity', OrganisationsController.entityIssueDetailsMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field/entry/:pageNumber', OrganisationsController.entryIssueDetailsMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field/entry', OrganisationsController.entryIssueDetailsMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field/:pageNumber?', OrganisationsController.issueTableMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field', OrganisationsController.issueTableMiddleware)
router.get('/:lpa/:dataset', OrganisationsController.datasetTaskListMiddleware)
router.get('/:lpa', OrganisationsController.overviewMiddleware)
router.get('/', OrganisationsController.organisationsMiddleware)

export default router
