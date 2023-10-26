const express = require('express')
const router = express.Router()

router.get('/data-subject', (req, res) => {
  const data = {

  }
  res.render('data-subject.html', data)
})

router.post('/data-subject', (req, res) => {
  console.log(req.body)
  res.redirect('/dataset')
})

module.exports = router
