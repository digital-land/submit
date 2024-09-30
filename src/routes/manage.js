import express from 'express'
import nunjucks from 'nunjucks'

const router = express.Router()

router.get('/', (req, res) => {
  const landing = nunjucks.render('landing.html', {})
  res.send(landing)
})

export default router
