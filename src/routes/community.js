import express from 'express'
import nunjucks from 'nunjucks'

const router = express.Router()

router.get('/', (req, res) => {
  const communityPage = nunjucks.render('community.html', {})
  res.send(communityPage)
})

export default router
