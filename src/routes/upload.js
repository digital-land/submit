const express = require('express')
const router = express.Router()

router.get('/upload', (req, res) => {
  const data = {

  }
  res.render('upload.html', data)
})

router.post('/upload', (req, res) => {
  console.log(req.body)
  res.redirect('/errors')
})

module.exports = router
