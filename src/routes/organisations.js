import express from 'express'
import OrganisationsController from '../controllers/OrganisationsController.js'

const router = express.Router()

router.get('/', OrganisationsController.getOrganisations)

router.get('/:lpa', OrganisationsController.getOverview)

router.get('/:lpa/:dataset', OrganisationsController.getDatasetTaskList)

router.get('/:lpa/:dataset/get-started', OrganisationsController.getGetStarted)

export default router
