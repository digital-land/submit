import logger from '../utils/logger.js'

const validationMessages = {
  'email-address': {
    required: 'Enter an email address',
    format: 'Enter an email address in the correct format'
  },
  'first-name': {
    required: 'Enter your first name'
  },
  'last-name': {
    required: 'Enter your last name'
  },
  lpa: {
    required: 'Enter the name of your local planning authority'
  },
  datafile: {
    required: 'Select a file',
    fileType: 'The selected file must be a CSV, GeoJSON, GML or GeoPackage file',
    fileSize: 'The selected file must be smaller than 10MB',
    fileNameTooLong: 'The selected file name must be less than 100 characters',
    fileNameInvalidCharacters: 'The selected file name must not contain any of the following characters: / \\ : * ? " < > |',
    fileNameDoubleExtension: 'The selected file name must not contain two file extensions',
    mimeType: 'The selected file must be a CSV, GeoJSON, GML or GeoPackage file',
    mimeTypeMalformed: 'The selected file has a malformed mime type'
  },
  url: {
    required: 'Enter a URL',
    format: 'Enter a valid URL',
    length: 'The URL must be less than 2048 characters',
    exists: 'The URL does not exist',
    filetype: 'The file referenced by URL must be a CSV, GeoJSON, GML or GeoPackage file',
    size: 'The file referenced by URL must be smaller than 10MB'
  },
  validationResult: {
    required: 'Unable to contact the API'
  },
  name: {
    required: 'Enter your full name'
  },
  email: {
    required: 'Enter an email address',
    email: 'Enter an email address in the correct format'
  },
  dataset: {
    required: 'Select a dataset'
  },
  'endpoint-url': {
    required: 'Enter an endpoint URL',
    format: 'Enter a valid endpoint URL',
    maxlength: 'The URL must be less than 2048 characters'
  },
  'documentation-url': {
    required: 'Enter a documentation URL',
    format: 'Enter a valid documentation URL',
    maxlength: 'The URL must be less than 2048 characters'
  },
  hasLicence: {
    required: 'You need to confirm this dataset is provided under the Open Government Licence'
  }
}

function validationMessageLookup (field, type) {
  if (!validationMessages[field] || !validationMessages[field][type]) {
    logger.error('No validation message found for field ' + field + ' and type ' + type)
    return `An error occurred of type ${type} for field ${field}`
  }
  return validationMessages[field][type]
}

export default validationMessageLookup
