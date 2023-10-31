module.exports = {
  '/start': {
    entryPoint: true,
    resetJourney: true,
    next: 'data-subject'
  },
  '/data-subject': {
    fields: ['data-subject'],
    next: 'dataset'
  },
  '/dataset': {
    fields: ['dataset'],
    next: 'upload'
  },
  '/upload': {
    fields: ['datafile'],
    next: 'submit'
  },
  '/submit': {
    controller: require('../../controllers/submitForm'),
    next: 'done'
  }
}
