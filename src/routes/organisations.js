import express from 'express'
import OrganisationsController from '../controllers/OrganisationsController.js'

const router = express.Router()

router.get('/:lpa/:dataset/get-started', OrganisationsController.getStartedMiddleware)
router.get('/:lpa/:dataset/overview', OrganisationsController.datasetOverviewMiddleware)
router.get('/:lpa/:dataset/data/:pageNumber', OrganisationsController.datasetDataviewMiddleware)
router.get('/:lpa/:dataset/data', OrganisationsController.datasetDataviewMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field/entry/:pageNumber', OrganisationsController.issueDetailsMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field/entry', OrganisationsController.issueDetailsMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field/:pageNumber?', OrganisationsController.issueTableMiddleware)
router.get('/:lpa/:dataset/:issue_type/:issue_field', OrganisationsController.issueTableMiddleware)
router.get('/:lpa/:dataset', OrganisationsController.oatasetTaskListMiddleware)
router.get('/:lpa', OrganisationsController.overviewMiddleware)
router.get('/', OrganisationsController.organisationsMiddleware)

export default router
