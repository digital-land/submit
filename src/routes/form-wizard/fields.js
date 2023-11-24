import { validate } from 'email-validator'

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
    validate: 'required',
    invalidates: ['validationResult']
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
