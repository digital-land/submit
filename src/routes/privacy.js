import express from 'express'
import nunjucks from 'nunjucks'

const router = express.Router()

router.get('/', (req, res) => {
  const privacyPage = nunjucks.render('privacy-notice.html', {})
  res.send(privacyPage)
})

export default router
