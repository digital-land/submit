import { validUrl } from '../../utils/validators.js'

export default {
  lpa: {
    validate: ['required']
  },
  name: {
    validate: ['required']
  },
  email: {
    validate: [
      'required',
      'email'
    ]
  },
  dataset: {
    validate: ['required']
  },
  'endpoint-url': {
    validate: [
      'required',
      {
        type: 'validUrl', fn: validUrl
      }
    ]
  },
  'documentation-url': {
    validate: [
      'required',
      {
        type: 'validUrl', fn: validUrl
      }
    ]
  },
  hasLicence: {
    validate: ['required']
  }
}
