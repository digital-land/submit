import express from 'express'
import LpaOverviewController from '../controllers/LpaOverviewController.js'

const router = express.Router()

router.get('/:lpa/overview', LpaOverviewController.getOverview)

export default router
