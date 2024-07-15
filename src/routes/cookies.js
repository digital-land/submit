import express from 'express'
import nunjucks from 'nunjucks'

const router = express.Router()

router.get('/', (req, res) => {
  const cookiesPage = nunjucks.render('cookies.html', {})
  res.send(cookiesPage)
})

export default router
