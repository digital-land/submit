<<<<<<< HEAD
export default {
  'data-subject': {
    validate: 'required',
    invalidates: ['dataset', 'upload-method', 'geomType']
  },
  dataset: {
    validate: 'required',
    invalidates: ['upload-method', 'geomType']
  },
  geomType: {
    validate: 'required'
  },
  'upload-method': {
    validate: 'required'
  },
  datafile: {
    validate: undefined // validation is done manually in the controller as we want to run it before the request is made to the backend
  },
  url: {
    validate: undefined // validation is done manually in the controller as we want to run it before the request is made to the backend
  },
  dataLooksCorrect: {
    validate: 'required'
=======
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
      { type: 'format', fn: validUrl },
      { type: 'maxlength', arguments: [2048] }
    ]
  },
  'documentation-url': {
    validate: [
      'required',
      { type: 'format', fn: validUrl },
      { type: 'maxlength', arguments: [2048] }
    ]
  },
  hasLicence: {
    validate: ['required']
>>>>>>> endpoint-submission-form/main
  }
}
