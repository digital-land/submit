module.exports = {
  '/': {
    entryPoint: true,
    resetJourney: true,
    next: 'data-subject',
    template: '../views/start.html'
  },
  '/data-subject': {
    controller: require('../../controllers/dataSubjectController'),
    fields: ['data-subject'],
    next: 'dataset'
  },
  '/dataset': {
    controller: require('../../controllers/datasetController'),
    fields: ['dataset'],
    next: 'upload'
  },
  '/upload': {
    controller: require('../../controllers/uploadController'),
    fields: ['validationResult'],
    next: [
      { fn: 'hasErrors', next: 'errors' },
      'no-errors'
    ]
  },
  '/errors': {
    controller: require('../../controllers/errorsController'),
    next: 'no-errors'
  },
  '/no-errors': {
    controller: require('../../controllers/MyController'),
    next: 'transformations'
  }
}
