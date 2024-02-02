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
    template: '../views/start.html',
    noPost: true
  },
  // '/data-subject': {
  //   ...baseSettings,
  //   fields: ['data-subject'],
  //   next: 'dataset'
  // },
  '/dataset': {
    ...baseSettings,
    controller: datasetController,
    fields: ['dataset', 'data-subject'],
    next: 'upload',
    backLink: './'
  },
  '/upload': {
    ...baseSettings,
    controller: uploadController,
    fields: ['datafile', 'validationResult'],
    next: [
      { fn: 'hasErrors', next: 'errors' },
      'no-errors'
    ],
    backLink: './dataset'
  },
  '/errors': {
    ...baseSettings,
    controller: errorsController,
    next: 'no-errors',
    backLink: './upload'
  },
  '/no-errors': {
    ...baseSettings,
    next: 'confirmation',
    backLink: './upload'
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
