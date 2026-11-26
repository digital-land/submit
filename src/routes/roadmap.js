import express from 'express'

const router = express.Router()

router.get('/', (req, res) => {
  res.render('roadmap.html')
})

export default router
