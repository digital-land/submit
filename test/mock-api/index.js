// a basic json express server with one endpoint that returns a json object

const express = require('express')

const app = express()

const config = require('../../config')

app.post(config.api.validationEndpoint, (req, res) => {
  const filename = req.file.originalname
  if (filename === 'conservation-area-errors.csv') {
    res.json({
      errors: 'true'
    })
  } else {
    res.json({
      errors: 'false'
    })
  }
})

app.listen(config.api.port, () => {
  console.log('listening on port 8082')
})
