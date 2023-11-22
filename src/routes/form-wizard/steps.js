import MyController from '../../controllers/MyController.js'
import datasetController from '../../controllers/datasetController.js'
import uploadController from '../../controllers/uploadController.js'
import errorsController from '../../controllers/errorsController.js'

export default {
  '/': {
    entryPoint: true,
    resetJourney: true,
    next: 'data-subject',
    template: '../views/start.html'
  },
  '/data-subject': {
    controller: MyController,
    fields: ['data-subject'],
    next: 'dataset'
  },
  '/dataset': {
    controller: datasetController,
    fields: ['dataset'],
    next: 'upload'
  },
  '/upload': {
    controller: uploadController,
    fields: ['validationResult'],
    next: [
      { fn: 'hasErrors', next: 'errors' },
      'no-errors'
    ]
  },
  '/errors': {
    controller: errorsController,
    next: 'no-errors'
  },
  '/no-errors': {
    controller: MyController,
    next: 'email-address'
  },
  '/email-address': {
    controller: MyController,
    fields: ['email-address'],
    next: 'name'
  },
  '/name': {
    controller: MyController,
    fields: ['first-name', 'last-name'],
    next: 'lpa'
  }
}
