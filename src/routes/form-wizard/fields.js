import { validate } from 'email-validator'
import UploadController from '../../controllers/uploadController.js'

export default {
  'data-subject': {
    validate: 'required',
    invalidates: ['datafile', 'dataset', 'validationResult']
  },
  dataset: {
    validate: 'required',
    invalidates: ['datafile', 'validationResult']
  },
  datafile: {
    validate: [
      'required',
      { type: 'fileType', fn: UploadController.extensionIsValid },
      { type: 'fileSize', fn: UploadController.sizeIsValid },
      { type: 'fileNameTooLong', fn: UploadController.fileNameIsntTooLong },
      { type: 'fileNameInvalidCharacters', fn: UploadController.fileNameIsValid },
      { type: 'fileNameDoubleExtension', fn: UploadController.fileNameDoesntContainDoubleExtension }
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
