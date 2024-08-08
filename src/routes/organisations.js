import express from 'express'
import OrganisationsController from '../controllers/OrganisationsController.js'

const router = express.Router()




router.get('/:lpa/dataset/:dataset/get-started', OrganisationsController.getGetStarted)
router.get('/:lpa/dataset/:dataset/:issueType', OrganisationsController.getIssueDetails)
router.get('/:lpa/dataset/:dataset', OrganisationsController.getDatasetTaskList)
router.get('/:lpa/overview', OrganisationsController.getOverview)
router.get('/', OrganisationsController.getOrganisations)

export default router
