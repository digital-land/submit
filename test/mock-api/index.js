'use strict'
// this script runs a mock server that mimics the pipeline runner api
// it doesn't perform any validations but instead looks at the filename to determine if it should return errors or not

// this really needs removing and instead we should be using wiremock

import express from 'express'

import config from '../../config/index.js'

import multer from 'multer'

import logger from '../../src/utils/logger.js'

import { readFileSync } from 'fs'
const upload = multer({ dest: 'uploads/' })

const APIResponse = JSON.parse(readFileSync('./test/testData/API_RUN_PIPELINE_RESPONSE.json'))

const app = express()

app.use(config.api.validationEndpoint, upload.single('upload_file'))

app.post(config.api.validationEndpoint, (req, res) => {
  let filename = 'unassigned'

  if (req.file && req.file.originalname) {
    filename = req.file.originalname
  }

  const _toSend = { ...APIResponse }

  if (filename.slice(-10) !== 'errors.csv' && filename !== 'unassigned') {
    _toSend['issue-log'] = []
    _toSend['column-field-log'] = _toSend['column-field-log'].filter(column => !column.missing)
  }

  if (req.body.upload_url === 'https://example.com/conservation-area-ok.csv') {
    _toSend['issue-log'] = []
    _toSend['column-field-log'] = _toSend['column-field-log'].filter(column => !column.missing)
  }

  res.json(_toSend)
})

app.listen(config.api.port, () => {
  logger.log('listening on port ' + config.api.port)
})
