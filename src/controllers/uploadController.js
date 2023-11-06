'use strict'
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

const { Controller } = require('hmpo-form-wizard')

const { readFile } = require('node:fs/promises')
const { lookup } = require('mime-types')

const apiRoute = 'http://127.0.0.1:8082/api/dataset/validate/file/request/'

class UploadController extends Controller {
  middlewareSetup () {
    super.middlewareSetup()
    this.use('/upload', upload.single('datafile'))
  }

  async post (req, res, next) {
    const formData = new FormData()
    formData.append('dataset', req.sessionModel.get('dataset'))
    formData.append('collection', req.sessionModel.get('data-subject'))
    formData.append('organization', 'mockOrg')

    const filePath = req.file.path
    const file = new Blob([await readFile(filePath)], { type: lookup(filePath) })

    formData.append('upload_file', file, req.file.originalname)

    try {
      // post the data to the api
      const result = await fetch(apiRoute, {
        method: 'POST',
        body: formData
      })

      const json = await result.json()

      console.log(json)

      // send the response back to the user
      // res.send(json)
      req.sessionModel.set('validationResult', json)
      super.post(req, res, next)
    } catch (e) {
      res.send(e)
    }
  }
}

module.exports = UploadController
