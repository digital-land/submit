const express = require('express')
const router = express.Router()

router.get('/dataset', (req, res) => {
  const data = {
    options: [
      { text: 'Article 4 direction dataset' },
      { text: 'Article 4 direction area dataset' }
    ]
  }
  res.render('dataset.html', data)
})

router.post('/dataset', (req, res) => {
  console.log(req.body)
  res.redirect('/upload')
})

module.exports = router
