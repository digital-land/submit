import express from 'express'
import nunjucks from 'nunjucks'

const router = express.Router()

router.get('/', (req, res) => {
  const extractPage = nunjucks.render('extract.html', {})
  res.send(extractPage)
})

export default router
