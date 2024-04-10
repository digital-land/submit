import logger from "../utils/logger"

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
    length: 'The URL must be less than 2048 characters'
  },
  validationResult: {
    required: 'Unable to contact the API'
  }
}

function validationMessageLookup (field, type) {
  if (!validationMessages[field] || !validationMessages[field][type]) {
    // throw new Error('No validation message found for field ' + field + ' and type ' + type)
    logger.error('No validation message found for field ' + field + ' and type ' + type)
    return `An error occurred of type ${type} for field ${field}`
  }
  return validationMessages[field][type]
}

export default validationMessageLookup
