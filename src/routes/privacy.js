import express from 'express'
import nunjucks from 'nunjucks'
import { render, EmptyParams } from './schemas.js'

const router = express.Router()

router.get('/', (req, res) => {
  const privacyPage = render(nunjucks, 'privacy-notice.html', EmptyParams, {})
  res.send(privacyPage)
})

export default router
