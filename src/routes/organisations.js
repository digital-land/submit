import express from 'express'
import OrganisationsController from '../controllers/OrganisationsController.js'

const router = express.Router()

router.get('/', OrganisationsController.getOrganisations)

router.get('/:lpa/overview', OrganisationsController.getOverview)

router.get('/:lpa/dataset/:dataset', OrganisationsController.getDatasetTaskList)

export default router
