'use strict'

import UploadController from './uploadController.js'

import AWS from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import { promises as fs, createReadStream } from 'fs'
import config from '../../config/index.js'
import logger from '../utils/logger.js'
import { postFileRequest } from '../utils/asyncRequestApi.js'
import { allowedFileTypes } from '../utils/utils.js'

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
    let dataFileForLocalValidation = null

    if (req.file) {
      dataFileForLocalValidation = {
        ...req.file,
        filePath: req.file.path,
        fileName: req.file.originalname
      }
    }

    const localValidationErrorType = UploadFileController.localValidateFile(dataFileForLocalValidation)

    if (localValidationErrorType) {
      const error = {
        key: 'datafile',
        type: localValidationErrorType
      }
      const errors = {
        datafile: new UploadFileController.Error(error.key, error, req, res)
      }
      logger.error('local validation failed during file upload', error)
      return next(errors)
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
    const validators = [
      { type: 'required', fn: UploadFileController.notUndefined },
      { type: 'fileType', fn: UploadFileController.extensionIsValid },
      { type: 'fileSize', fn: UploadFileController.sizeIsValid },
      { type: 'fileNameTooLong', fn: UploadFileController.fileNameIsntTooLong },
      { type: 'fileNameInvalidCharacters', fn: UploadFileController.fileNameIsValid },
      { type: 'fileNameDoubleExtension', fn: UploadFileController.fileNameDoesntContainDoubleExtension },
      { type: 'mimeType', fn: UploadFileController.fileMimeTypeIsValid },
      { type: 'mimeTypeMalformed', fn: UploadFileController.fileMimeTypeMatchesExtension }
    ]

    return validators.find(validator => !validator.fn(datafile))?.type
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
      logger.error('Error uploading file to S3: ' + error.message)
      throw error
    }
  }

  static notUndefined (datafile) {
    return datafile !== undefined && datafile !== null && datafile !== ''
  }

  static extensionIsValid (datafile) {
    const allowedExtensions = Object.keys(allowedFileTypes)

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
    const allowedMimeTypes = Object.values(allowedFileTypes).flat()

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

    if (!allowedFileTypes[extension].includes(datafile.mimetype)) {
      return false
    }

    return true
  }
}

export default UploadFileController
