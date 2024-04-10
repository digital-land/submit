'use strict'

import UploadController from './uploadController.js'

import AWS from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import { promises as fs, createReadStream } from 'fs'
import config from '../../config/index.js'
import logger from '../utils/logger.js'
import { postFileRequest } from '../utils/asyncRequestApi.js'

AWS.config.update({
  region: config.aws.region,
  endpoint: config.aws.endpoint,
  s3ForcePathStyle: config.aws.s3ForcePathStyle || false
})

const upload = multer({ dest: 'uploads/' })

class UploadFileController extends UploadController {
  middlewareSetup () {
    super.middlewareSetup()
    this.use('/upload', upload.single('datafile'))
  }

  async post (req, res, next) {
    this.resetValidationErrorMessage()

    let dataFileForLocalValidation = null

    if (req.file) {
      dataFileForLocalValidation = {
        ...req.file,
        filePath: req.file.path,
        fileName: req.file.originalname
      }
      req.body.datafile = req.file
    }

    const localValidationResult = UploadFileController.localValidateFile(dataFileForLocalValidation)

    if (!localValidationResult) {
      this.validationError('localValidationError', '', null, req)
      super.post(req, res, next)
      return
    }

    
    try {
      const uploadedFilename = await UploadFileController.uploadFileToS3(req.file)
      // delete the file from the uploads folder
      if (req.file && req.file.path) { fs.unlink(req.file.path) }
      
      const id = await postFileRequest({ ...this.getBaseFormData(req), originalFilename: req.file.originalname, uploadedFilename })
      req.body.request_id = id
      
      // log the file name, type and size as an object
      logger.info('file submitted for processing:', { type: 'fileUploaded', name: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size })

      super.post(req, res, next)
    } catch (error) {
      next(error)
    }
  }

  static localValidateFile (datafile) {
    return UploadFileController.notUndefined(datafile) &&
            UploadFileController.extensionIsValid(datafile) &&
            UploadFileController.sizeIsValid(datafile) &&
            UploadFileController.fileNameIsntTooLong(datafile) &&
            UploadFileController.fileNameIsValid(datafile) &&
            UploadFileController.fileNameDoesntContainDoubleExtension(datafile) &&
            UploadFileController.fileMimeTypeIsValid(datafile) &&
            UploadFileController.fileMimeTypeMatchesExtension(datafile)
  }

  /*
    This function should upload a file to s3, saving the file with a UUID as the filename. then return the UUID
  */
  static async uploadFileToS3 (datafile, signedURL) {
    const s3 = new AWS.S3()
    const fileStream = createReadStream(datafile.path)
    const uuid = uuidv4()

    const params = {
      Bucket: config.aws.bucket, // replace 'your-bucket-name' with your actual bucket name
      Key: uuid,
      Body: fileStream
    }

    try {
      await s3.upload(params).promise()
      return uuid
    } catch (error) {
      console.log('Error uploading file: ', error)
      throw new Error('Error uploading file to S3')
    }
  }

  static notUndefined (datafile) {
    return datafile !== undefined && datafile !== null && datafile !== ''
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
