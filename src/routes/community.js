import express from 'express'

const router = express.Router()

router.get('/', (req, res) => {
  res.render('community.html')
})

export default router
