import express from 'express'
import statusController from '../controllers/statusController.js'

const router = express.Router()

router.get('/:result_id', async (req, res, next) => {
  return statusController.get(req, res, next)
})

export default router
