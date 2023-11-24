import MyController from '../../controllers/MyController.js'
import datasetController from '../../controllers/datasetController.js'
import uploadController from '../../controllers/uploadController.js'
import errorsController from '../../controllers/errorsController.js'

const baseSettings = {
  controller: MyController,
  editable: true,
  editBackStep: 'check'
}

export default {
  '/': {
    entryPoint: true,
    resetJourney: true,
    next: 'data-subject',
    template: '../views/start.html'
  },
  '/data-subject': {
    ...baseSettings,
    fields: ['data-subject'],
    next: 'dataset'
  },
  '/dataset': {
    ...baseSettings,
    controller: datasetController,
    fields: ['dataset'],
    next: 'upload'
  },
  '/upload': {
    ...baseSettings,
    controller: uploadController,
    fields: ['validationResult', 'datafile'],
    next: [
      { fn: 'hasErrors', next: 'errors' },
      'no-errors'
    ]
  },
  '/errors': {
    ...baseSettings,
    controller: errorsController,
    next: 'no-errors'
  },
  '/no-errors': {
    ...baseSettings,
    next: 'email-address'
  },
  '/email-address': {
    ...baseSettings,
    fields: ['email-address'],
    next: 'name'
  },
  '/name': {
    ...baseSettings,
    fields: ['first-name', 'last-name'],
    next: 'lpa'
  },
  '/lpa': {
    ...baseSettings,
    fields: ['lpa'],
    next: 'check'
  },
  '/check': {
    ...baseSettings,
    next: 'confirmation'
  },
  '/confirmation': {
    ...baseSettings,
    noPost: true
  }
}
