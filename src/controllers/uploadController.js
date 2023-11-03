'use strict'
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

const { Controller } = require('hmpo-form-wizard')

class UploadController extends Controller {
  middlewareSetup () {
    super.middlewareSetup()
    this.use('/upload', upload.single('datafile'))
  }

  post (req, res, next) {
    req.body.datafile = req.file
    super.post(req, res, next)
  }
}

module.exports = UploadController
