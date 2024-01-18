'use strict'
import multer from 'multer'
import axios from 'axios'
import fs from 'fs/promises'
import { lookup } from 'mime-types'
import PageController from './pageController.js'
import config from '../../config/index.js'

import { severityLevels } from '../utils/utils.js'
import logger from '../utils/logger.js'
import hash from '../utils/hasher.js'

const upload = multer({ dest: 'uploads/' })

const apiRoute = config.api.url + config.api.validationEndpoint

class UploadController extends PageController {
  middlewareSetup () {
    super.middlewareSetup()
    this.use('/upload', upload.single('datafile'))
  }

  async get (req, res, next) {
    req.form.options.validationError = this.validationErrorMessage
    super.get(req, res, next)
  }

  async post (req, res, next) {
    this.validationErrorMessage = undefined
    if (req.file !== undefined) {
      req.body.datafile = req.file
      let jsonResult = {}
      try {
        jsonResult = await this.validateFile({
          filePath: req.file.path,
          fileName: req.file.originalname,
          originalname: req.file.originalname,
          dataset: req.sessionModel.get('dataset'),
          dataSubject: req.sessionModel.get('data-subject'),
          organisation: 'local-authority-eng:CAT', // ToDo: this needs to be dynamic, not collected in the prototype, should it be?
          sessionId: await hash(req.sessionID),
          ipAddress: await hash(req.ip)
        })
        if (jsonResult) {
          if (jsonResult.error) {
            this.validationError('apiError', jsonResult.message, {}, req)
          } else {
            try {
              this.errorCount = jsonResult['issue-log'].filter(issue => issue.severity === severityLevels.error).length + jsonResult['column-field-log'].filter(log => log.missing).length
              req.body.validationResult = jsonResult
            } catch (error) {
              this.validationError('apiError', 'Error parsing api response error count', error, req)
            }
          }
        } else {
          this.validationError('apiError', 'Nothing returned from the api', null, req)
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          this.validationError('apiError', 'Unable to reach the api', error, req)
        } else {
          switch (error.response.status) {
            case 400:
              this.validationError('apiError', 'Bad request sent to the api', error, req)
              break
            case 404:
              this.validationError('apiError', 'Validation endpoint not found', error, req)
              break
            case 500:
              this.validationError('apiError', 'Internal Server Error', error, req)
              break
            default:
              this.validationError('apiError', 'Error uploading file', error, req)
          }
        }
      }
    }

    // delete the file from the uploads folder
    if (req.file && req.file.path) { fs.unlink(req.file.path) }

    super.post(req, res, next)
  }

  validationError (type, message, errorObject, req) {
    logger.error({ type, message, errorObject })
    req.body.validationResult = { error: true, message, errorObject }
    this.validationErrorMessage = message
  }

  async validateFile (datafile) {
    if (
      !UploadController.extensionIsValid(datafile) ||
      !UploadController.sizeIsValid(datafile) ||
      !UploadController.fileNameIsntTooLong(datafile) ||
      !UploadController.fileNameIsValid(datafile) ||
      !UploadController.fileNameDoesntContainDoubleExtension(datafile)
    ) {
      return false
    }

    const { filePath, fileName, dataset, dataSubject, organisation, sessionId, ipAddress } = datafile

    const formData = new FormData()
    formData.append('dataset', dataset)
    formData.append('collection', dataSubject)
    formData.append('organisation', organisation)
    formData.append('sessionId', sessionId)
    formData.append('ipAddress', ipAddress)

    const file = new Blob([await fs.readFile(filePath)], { type: lookup(filePath) })

    formData.append('upload_file', file, fileName)

    const result = await axios.post(apiRoute, formData)

    return result.data
  }

  static resultIsValid (validationResult) {
    return validationResult ? !validationResult.error : false
  }

  static extensionIsValid (datafile) {
    const allowedExtensions = ['csv', 'xls', 'xlsx', 'json', 'geojson', 'gml', 'gpkg']

    const parts = datafile.originalname.split('.')

    const extension = parts[parts.length - 1]
    if (!allowedExtensions.includes(extension)) {
      return false
    }

    return true
  }

  static sizeIsValid (datafile) {
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (datafile.size > maxSize) {
      return false
    }

    return true
  }

  static fileNameIsntTooLong (datafile) {
    const maxSize = 255 // Maximum filename size
    if (datafile.originalname.length > maxSize) {
      return false
    }
    return true
  }

  static fileNameIsValid (datafile) {
    const invalidCharacters = /[<>:"/\\|?*]/
    if (invalidCharacters.test(datafile.originalname)) {
      return false
    }
    return true
  }

  static fileNameDoesntContainDoubleExtension (datafile) {
    const parts = datafile.originalname.split('.')
    if (parts.length > 2) {
      return false
    }
    return true
  }

  static fileMimeTypeIsValid (datafile) {
    const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json', 'application/vnd.geo+json', 'application/gml+xml', 'application/gpkg']
    if (!allowedMimeTypes.includes(datafile.mimetype)) {
      return false
    }
    return true
  }

  static fileMimeTypeMatchesExtension (datafile) {
    const parts = datafile.originalname.split('.')
    const extension = parts[parts.length - 1]

    const mimeTypes = {
      csv: 'text/csv',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      json: 'application/json',
      geojson: 'application/vnd.geo+json',
      gml: 'application/gml+xml',
      gpkg: 'application/gpkg'
    }

    if (mimeTypes[extension] !== datafile.mimetype) {
      return false
    }

    return true
  }

  hasErrors () {
    return this.errorCount > 0
  }
}

export default UploadController
