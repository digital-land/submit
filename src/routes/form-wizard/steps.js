import PageController from '../../controllers/pageController.js'
import datasetController from '../../controllers/datasetController.js'
// import uploadFileController from '../../controllers/uploadFileController.js'
import s3FileUploadController from '../../controllers/s3FileUploadController.js'
import uploadUrlController from '../../controllers/uploadUrlController.js'
import errorsController from '../../controllers/errorsController.js'
import resultController from '../../controllers/resultController.js'

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
    next: 'upload-method',
    backLink: './'
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
    controller: s3FileUploadController,
    fields: ['original_filename' ],
    // fields: ['datafile', 'validationResult'],
    next: [
      // { fn: 'hasErrors', next: 'errors' },
      // 'no-errors'
      'result'
    ],
    backLink: './upload-method'
  },
  '/errors': {
    ...baseSettings,
    controller: errorsController,
    next: 'no-errors',
    backLink: './upload-method'
  },
  '/result': {
    ...baseSettings,
    controller: resultController,
    noPost: true
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
