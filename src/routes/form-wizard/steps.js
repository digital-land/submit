import chooseDatasetController from '../../controllers/chooseDatasetController.js'

const defaultParams = {
  entryPoint: true // needs changing before production
}

export default {
  '/start': {
    ...defaultParams,
    entryPoint: true,
    resetJourney: true,
    noPost: true,
    next: 'lpa-details'
  },
  '/lpa-details': {
    ...defaultParams,
    fields: ['lpa', 'name', 'email'],
    next: 'choose-dataset'
  },
  '/choose-dataset': {
    ...defaultParams,
    fields: ['dataset'],
    next: 'dataset-details',
    controller: chooseDatasetController
  },
  '/dataset-details': {
    ...defaultParams,
    fields: ['endpoint-url', 'documentation-url', 'hasLicense'],
    next: 'check-answers'
  },
  '/check-answers': {
    ...defaultParams,
    next: 'confirmation'
  },
  '/confirmation': {
    ...defaultParams

  }
}
