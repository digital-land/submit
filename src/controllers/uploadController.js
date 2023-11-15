'use strict'
const multer = require('multer')
const axios = require('axios')
const upload = multer({ dest: 'uploads/' })

const MyController = require('./MyController.js')

const { readFile } = require('node:fs/promises')
const { lookup } = require('mime-types')

const config = require('../../config')

const apiRoute = config.api.url + config.api.validationEndpoint

class UploadController extends MyController {
  middlewareSetup () {
    super.middlewareSetup()
    this.use('/upload', upload.single('datafile'))
  }

  async post (req, res, next) {
    if (req.file !== undefined) {
      try {
        const jsonResult = await this.validateFile({
          filePath: req.file.path,
          fileName: req.file.originalname,
          dataset: req.sessionModel.get('dataset'),
          dataSubject: req.sessionModel.get('data-subject'),
          organization: 'local-authority-eng:CAT' // ToDo: this needs to be dynamic, not collected in the prototype, should it be?
        })
        this.result = jsonResult
        this.errorCount = jsonResult['issue-log'].length
        req.body.validationResult = jsonResult
      } catch (error) {
        console.log(error)
      }
    }
    super.post(req, res, next)
  }

  async validateFile ({ filePath, fileName, dataset, dataSubject, organization }) {
    const formData = new FormData()
    formData.append('dataset', dataset)
    formData.append('collection', dataSubject)
    formData.append('organization', organization)

    const file = new Blob([await readFile(filePath)], { type: lookup(filePath) })

    formData.append('upload_file', file, fileName)

    const result = await axios.post(apiRoute, formData)

    return JSON.parse(result.data)
  }

  hasErrors () {
    return this.errorCount > 0
  }
}

module.exports = UploadController
