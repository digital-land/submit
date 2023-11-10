'use strict'
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

const { Controller } = require('hmpo-form-wizard')

const { readFile } = require('node:fs/promises')
const { lookup } = require('mime-types')

const config = require('../../config')

const apiRoute = config.api.url + config.api.validationEndpoint

class UploadController extends Controller {
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
          organization: 'mockOrg'
        })
        req.sessionModel.set('validationResult', jsonResult)
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

    // post the data to the api
    const result = await fetch(apiRoute, {
      method: 'POST',
      body: formData
    })

    return await result.json()
  }
}

module.exports = UploadController
