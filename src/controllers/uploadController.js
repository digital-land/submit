'use strict'
import multer from 'multer'
import axios from 'axios'
import { readFile } from 'fs/promises'
import { lookup } from 'mime-types'
import MyController from './MyController.js'
import config from '../../config/index.js'

const upload = multer({ dest: 'uploads/' })

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
          organisation: 'local-authority-eng:CAT' // ToDo: this needs to be dynamic, not collected in the prototype, should it be?
        })
        this.errorCount = jsonResult['issue-log'].length
        req.body.validationResult = jsonResult
      } catch (error) {
        console.log(error)
      }
    }
    super.post(req, res, next)
  }

  async validateFile ({ filePath, fileName, dataset, dataSubject, organisation }) {
    const formData = new FormData()
    formData.append('dataset', dataset)
    formData.append('collection', dataSubject)
    formData.append('organisation', organisation)

    const file = new Blob([await readFile(filePath)], { type: lookup(filePath) })

    formData.append('upload_file', file, fileName)

    const result = await axios.post(apiRoute, formData)

    return result.data
  }

  hasErrors () {
    return this.errorCount > 0
  }
}

export default UploadController
