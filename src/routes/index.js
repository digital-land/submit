const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  const data = {

  }
  res.render('start.html', data)
})

module.exports = router
