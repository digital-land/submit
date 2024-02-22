import { validate } from 'email-validator'
import UploadFileController from '../../controllers/uploadFileController.js'
import UploadController from '../../controllers/uploadController.js'
import UploadUrlController from '../../controllers/uploadUrlController.js'

export default {
  'data-subject': {
    validate: 'required',
    invalidates: ['dataset', 'validationResult', 'upload-method']
  },
  dataset: {
    validate: 'required',
    invalidates: ['validationResult', 'upload-method']
  },
  original_filename: {
    validate: 'required'
  },
  uploaded_filename: {
    validate: 'required'
  },
  'upload-method': {
    validate: 'required',
    invalidates: ['validationResult']
  },
  datafile: {
    validate: [
      'required',
      { type: 'fileType', fn: UploadFileController.extensionIsValid },
      { type: 'fileSize', fn: UploadFileController.sizeIsValid },
      { type: 'fileNameTooLong', fn: UploadFileController.fileNameIsntTooLong },
      { type: 'fileNameInvalidCharacters', fn: UploadFileController.fileNameIsValid },
      { type: 'fileNameDoubleExtension', fn: UploadFileController.fileNameDoesntContainDoubleExtension },
      { type: 'mimeType', fn: UploadFileController.fileMimeTypeIsValid },
      { type: 'mimeTypeMalformed', fn: UploadFileController.fileMimeTypeMatchesExtension }
    ],
    invalidates: ['validationResult']
  },
  url: {
    validate: [
      'required',
      { type: 'format', fn: UploadUrlController.urlIsValid },
      { type: 'length', fn: UploadUrlController.urlIsNotTooLong }
    ],
    invalidates: ['validationResult']
  },
  validationResult: {
    validate: [
      'required',
      { type: 'validationError', fn: UploadController.resultIsValid }
    ]
  },
  'email-address': {
    validate: [
      'required',
      { type: 'format', fn: email => validate(email) }
    ]
  },
  'first-name': {
    validate: 'required'
  },
  'last-name': {
    validate: 'required'
  },
  lpa: {
    validate: 'required'
  }
}
