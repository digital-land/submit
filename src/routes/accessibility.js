import express from 'express'

const router = express.Router()

router.get('/', (req, res) => {
  res.render('accessibility.html')
})

export default router
