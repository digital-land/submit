import express from 'express'
import OrganisationsController from '../controllers/OrganisationsController.js'

const router = express.Router()

router.get('/', OrganisationsController.getOrganisations)

router.get('/:lpa/overview', OrganisationsController.getOverview)

export default router
