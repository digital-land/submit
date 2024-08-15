import express from 'express'
import nunjucks from 'nunjucks'
import { render, EmptyParams } from './schemas.js'

const router = express.Router()

router.get('/', (req, res) => {
  const accessibilityPage = render(nunjucks, 'accessibility.html', EmptyParams, {})
  res.send(accessibilityPage)
})

export default router
