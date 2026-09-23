import { Router } from 'express'
import { requireIpInformationSession, showEmailForm, sendInformation, showConfirmation } from '../controllers/ipInformationController.js'

const router = Router()
router.use(requireIpInformationSession)
router.get('/email', showEmailForm)
router.post('/email', sendInformation)
router.get('/confirmation', showConfirmation)

export default router
