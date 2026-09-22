import express from 'express'
import nunjucks from 'nunjucks'

const router = express.Router()

router.get('/', (req, res) => {
  const roadmapPage = nunjucks.render('roadmap.html', {})
  res.send(roadmapPage)
})

export default router
