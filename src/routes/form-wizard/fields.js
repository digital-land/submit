import { validate } from 'email-validator'
import UploadFileController from '../../controllers/uploadFileController.js'
import UploadController from '../../controllers/uploadController.js'

export default {
  'data-subject': {
    validate: 'required',
    invalidates: ['datafile', 'dataset', 'validationResult', 'upload-method']
  },
  dataset: {
    validate: 'required',
    invalidates: ['datafile', 'validationResult', 'upload-method']
  },
  'upload-method': {
    validate: 'required',
    invalidates: ['datafile', 'validationResult']
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
