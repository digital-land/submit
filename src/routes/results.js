import express from 'express'
import resultsController from '../controllers/resultsController.js'

const router = express.Router()

router.get('/:result_id', async (req, res, next) => {
  return resultsController.get(req, res, next)
})

export default router
