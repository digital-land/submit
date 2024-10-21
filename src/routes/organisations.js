import express from 'express'
import OrganisationsController from '../controllers/OrganisationsController.js'

const router = express.Router()

router.get('/:lpa/:dataset/get-started', OrganisationsController.getGetStartedMiddleware)
router.get('/:lpa/:dataset/overview', OrganisationsController.getDatasetOverviewMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field/entry/:pageNumber?', OrganisationsController.getIssueDetailsMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field/:pageNumber?', OrganisationsController.getIssueTableMiddleware)
router.get('/:lpa/:dataset', OrganisationsController.getDatasetTaskListMiddleware)
router.get('/:lpa', OrganisationsController.getOverviewMiddleware)
router.get('/', OrganisationsController.getOrganisationsMiddleware)

export default router
