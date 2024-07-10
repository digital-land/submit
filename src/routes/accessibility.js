import express from 'express'
import nunjucks from 'nunjucks'

const router = express.Router()

router.get('/', (req, res) => {
  const accessibilityPage = nunjucks.render('accessibility.html', {})
  res.send(accessibilityPage)
})

export default router
