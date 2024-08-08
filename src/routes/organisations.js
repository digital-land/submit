import express from 'express'
import OrganisationsController from '../controllers/OrganisationsController.js'

const router = express.Router()

router.get('/:lpa/:dataset/get-started', OrganisationsController.getGetStarted)
router.get('/:lpa/:dataset/:issue_type', OrganisationsController.getIssueDetails)
router.get('/:lpa/:dataset', OrganisationsController.getDatasetTaskList)
router.get('/:lpa', OrganisationsController.getOverview)
router.get('/', OrganisationsController.getOrganisations)

export default router
