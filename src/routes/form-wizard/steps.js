import PageController from '../../controllers/pageController.js'
import datasetController from '../../controllers/datasetController.js'
import uploadFileController from '../../controllers/uploadFileController.js'
import uploadUrlController from '../../controllers/uploadUrlController.js'

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
    backLink: './upload-method'
  }
}
