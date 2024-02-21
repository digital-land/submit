'use strict'

import UploadController from './uploadController.js'

import multer from 'multer'
import axios from 'axios'
import fs from 'fs/promises'
import { lookup } from 'mime-types'
import config from '../../config/index.js'
import logger from '../utils/logger.js'

const upload = multer({ dest: 'uploads/' })

class UploadFileController extends UploadController {
  middlewareSetup () {
    super.middlewareSetup()
    this.use('/upload', upload.single('datafile'))
  }

  async post (req, res, next) {
    this.resetValidationErrorMessage()
    if (req.file !== undefined) {
      req.body.datafile = req.file

      // log the file name, type and size as an object
      logger.info('file uploaded:', { type: 'fileUploaded', name: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size })

      const localValidationResult = UploadFileController.localValidateFile({
        ...req.file,
        filePath: req.file.path,
        fileName: req.file.originalname
      })
      if (!localValidationResult) {
        this.validationError('localValidationError', '', null, req)
      } else {
        try {
          const apiValidationResult = await this.apiValidateFile({
            ...req.file,
            filePath: req.file.path,
            fileName: req.file.originalname,
            dataset: req.sessionModel.get('dataset'),
            dataSubject: req.sessionModel.get('data-subject'),
            sessionId: req.session.id,
            ipAddress: req.ip
          })
          this.handleValidationResult(apiValidationResult, req)
        } catch (error) {
          this.handleApiError(error, req)
        }
      }
    }

    // delete the file from the uploads folder
    if (req.file && req.file.path) { fs.unlink(req.file.path) }

    super.post(req, res, next)
  }

  static localValidateFile (datafile) {
    return UploadFileController.extensionIsValid(datafile) &&
            UploadFileController.sizeIsValid(datafile) &&
            UploadFileController.fileNameIsntTooLong(datafile) &&
            UploadFileController.fileNameIsValid(datafile) &&
            UploadFileController.fileNameDoesntContainDoubleExtension(datafile) &&
            UploadFileController.fileMimeTypeIsValid(datafile) &&
            UploadFileController.fileMimeTypeMatchesExtension(datafile)
  }

  async apiValidateFile (datafile) {
    const { filePath, fileName, dataset, dataSubject, organisation, sessionId, ipAddress } = datafile

    const formData = this.constructBaseFormData({ dataset, dataSubject, organisation, sessionId, ipAddress })
    const file = new Blob([await fs.readFile(filePath)], { type: lookup(filePath) })
    formData.append('upload_file', file, fileName)

    const result = await axios.post(this.apiRoute, formData, { timeout: config.api.requestTimeout })

    return result.data
  }

  static extensionIsValid (datafile) {
    const allowedExtensions = ['csv', 'xls', 'xlsx', 'json', 'geojson', 'gml', 'gpkg', 'sqlite3']

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
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'application/vnd.geo+json',
      'application/gml+xml',
      'application/gpkg',
      'application/geopackage+sqlite3',
      'application/octet-stream' // This is a catch all for when the mime type is not recognised
    ]
    if (!allowedMimeTypes.includes(datafile.mimetype)) {
      return false
    }
    return true
  }

  static fileMimeTypeMatchesExtension (datafile) {
    const parts = datafile.originalname.split('.')
    const extension = parts[parts.length - 1]

    if (datafile.mimetype === 'application/octet-stream') {
      return true
    }

    const mimeTypes = {
      csv: 'text/csv',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      json: 'application/json',
      geojson: 'application/vnd.geo+json',
      gml: 'application/gml+xml',
      gpkg: 'application/gpkg',
      sqlite: 'application/geopackage+sqlite3'
    }

    if (mimeTypes[extension] !== datafile.mimetype) {
      return false
    }

    return true
  }
}

export default UploadFileController
