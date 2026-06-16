// ToDo: split this into two form wizards
import { validUrl, validEmail, validDocumentationUrl } from '../../../utils/validators.js'

export default {
  lpa: {
    validate: ['required']
  },
  orgId: {
    validate: ['required']
  },
  name: {
    validate: ['required']
  },
  email: {
    validate: [
      'required',
      'email',
      { type: 'format', fn: validEmail }
    ]
  },
  dataset: {
    validate: ['required']
  },
  'endpoint-url': {
    validate: [
      'required',
      { type: 'format', fn: validUrl },
      { type: 'maxlength', arguments: [2048] }
    ]
  },
  'documentation-url': {
    validate: [
      'required',
      { type: 'format', fn: validDocumentationUrl },
      { type: 'maxlength', arguments: [2048] }
    ]
  },
  hasLicence: {
    validate: ['required']
  }
}
