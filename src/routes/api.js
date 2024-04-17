import express from 'express'
import { getRequestData } from '../utils/asyncRequestApi.js'

const router = express.Router()

router.get('/status/:result_id', async (req, res) => {
  const response = getRequestData(req.params.result_id)
    .then(data => res.json(data))
    .catch(error => res.status(500).json({ error }))

  return response
})

export default router
