import express from 'express'
import nunjucks from 'nunjucks'

const router = express.Router()

router.get('/', (req, res) => {
    const manage = nunjucks.render('start.html', {})
    res.send(manage)
  })

export default router
