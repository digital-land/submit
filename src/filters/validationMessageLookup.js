// import logger from '../utils/logger.js'

const validationMessages = {
  lpa: {
    required: 'Enter the name of your local planning authority'
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
    required: 'Your data must be licensed under the Open Government Licence'
  }
}

function validationMessageLookup (field, type) {
  if (!validationMessages[field] || !validationMessages[field][type]) {
    // logger.error('No validation message found for field ' + field + ' and type ' + type)
    return `An error occurred of type ${type} for field ${field}`
  }
  return validationMessages[field][type]
}

export default validationMessageLookup
