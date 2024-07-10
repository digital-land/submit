// ToDo: split this into two form wizards
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
  }
}
