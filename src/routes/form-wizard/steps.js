import PageController from '../../controllers/pageController.js'
import datasetController from '../../controllers/datasetController.js'
import uploadFileController from '../../controllers/uploadFileController.js'
import uploadUrlController from '../../controllers/uploadUrlController.js'
import errorsController from '../../controllers/errorsController.js'
import NoErrorsController from '../../controllers/noErrorsController.js'

const baseSettings = {
  controller: PageController,
  editable: true,
  editBackStep: 'check'
}

export default {
  '/': {
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
    next: [
      { field: 'dataset', fn: 'requiresGeometryTypeToBeSelected', next: 'geometry-type' },
      'upload-method'
    ],
    backLink: './'
  },
  '/geometry-type': {
    ...baseSettings,
    fields: ['geomType'],
    next: 'upload-method',
    backLink: './dataset'
  },
  '/upload-method': {
    ...baseSettings,
    fields: ['upload-method'],
    next: [
      { field: 'upload-method', op: '===', value: 'url', next: 'url' },
      'upload'
    ],
    backLink: './dataset'
  },
  '/url': {
    ...baseSettings,
    controller: uploadUrlController,
    fields: ['url', 'validationResult'],
    next: [
      { fn: 'hasErrors', next: 'errors' },
      'no-errors'
    ],
    backLink: './upload-method'
  },
  '/upload': {
    ...baseSettings,
    controller: uploadFileController,
    fields: ['datafile', 'validationResult'],
    next: [
      { fn: 'hasErrors', next: 'errors' },
      'no-errors'
    ],
    backLink: './upload-method'
  },
  '/errors': {
    ...baseSettings,
    controller: errorsController,
    backLink: './upload-method'
  },
  '/no-errors': {
    ...baseSettings,
    controller: NoErrorsController,
    next: 'confirmation',
    backLink: './upload-method'
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
