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
  }
}

function validationMessageLookup (field, type) {
  if (!validationMessages[field] || !validationMessages[field][type]) {
    throw new Error('No validation message found for field ' + field + ' and type ' + type)
  }
  return validationMessages[field][type]
}

export default validationMessageLookup
