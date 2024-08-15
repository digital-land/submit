import express from 'express'
import nunjucks from 'nunjucks'
import { render, EmptyParams } from './schemas.js'

const router = express.Router()

router.get('/', (req, res) => {
  const manage = render(nunjucks, 'start.html', EmptyParams, {})
  res.send(manage)
})

export default router
