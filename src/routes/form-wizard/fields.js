import { validate } from 'email-validator'

export default {
  'data-subject': {
    validate: 'required'
  },
  dataset: {
    validate: 'required'
  },
  datafile: {
    validate: 'required'
  },
  validationResult: {
    validate: 'required'
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
