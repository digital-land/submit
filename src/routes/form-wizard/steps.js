import PageController from '../../controllers/pageController.js'
import datasetController from '../../controllers/datasetController.js'
import uploadController from '../../controllers/uploadController.js'
import errorsController from '../../controllers/errorsController.js'

const baseSettings = {
  controller: PageController,
  editable: true,
  editBackStep: 'check'
}

export default {
  '/': {
    controller: PageController,
    entryPoint: true,
    resetJourney: true,
    next: 'dataset',
    template: '../views/start.html'
  },
  // '/data-subject': {
  //   ...baseSettings,
  //   fields: ['data-subject'],
  //   next: 'dataset'
  // },
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
    next: 'confirmation'
  },
  // '/email-address': {
  //   ...baseSettings,
  //   fields: ['email-address'],
  //   next: 'name'
  // },
  // '/name': {
  //   ...baseSettings,
  //   fields: ['first-name', 'last-name'],
  //   next: 'lpa'
  // },
  // '/lpa': {
  //   ...baseSettings,
  //   fields: ['lpa'],
  //   next: 'check'
  // },
  // '/check': {
  //   ...baseSettings,
  //   next: 'confirmation'
  // },
  '/confirmation': {
    ...baseSettings,
    noPost: true
  }
}
