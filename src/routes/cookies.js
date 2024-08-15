import express from 'express'
import nunjucks from 'nunjucks'
import { EmptyParams, render } from './schemas.js'

const router = express.Router()

router.get('/', (req, res) => {
  const cookiesPage = render(nunjucks, 'cookies.html', EmptyParams, {})
  res.send(cookiesPage)
})

export default router
