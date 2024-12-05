import express from 'express'
import { getRequestData } from '../services/asyncRequestApi.js'
import { getBoundaryForLpa } from '../services/boundaryService.js'

const router = express.Router()

router.get('/status/:result_id', async (req, res) => {
  const response = getRequestData(req.params.result_id)
    .then(data => res.json(data))
    .catch(error => res.status(500).json({ error }))

  return response
})

router.get('/get-lpa-boundary/:boundaryId', async (req, res) => {
  const response = await getBoundaryForLpa(req.params.boundaryId)

  return res.json(response)
})

export default router
