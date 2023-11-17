import dataSubjectController from '../../controllers/dataSubjectController.js'
import datasetController from '../../controllers/datasetController.js'
import uploadController from '../../controllers/uploadController.js'
import errorsController from '../../controllers/errorsController.js'
import MyController from '../../controllers/MyController.js'

export default {
  '/': {
    entryPoint: true,
    resetJourney: true,
    next: 'data-subject',
    template: '../views/start.html'
  },
  '/data-subject': {
    controller: dataSubjectController,
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
    next: 'errors'
  },
  '/errors': {
    controller: errorsController,
    next: 'no-errors'
  },
  '/no-errors': {
    controller: MyController,
    next: 'transformations'
  }
}
