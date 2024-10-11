// ToDo: Split this into two form wizards
import PageController from '../../../controllers/pageController.js'
import datasetController, { requiresGeometryTypeToBeSelected } from '../../../controllers/datasetController.js'
import uploadFileController from '../../../controllers/uploadFileController.js'
import submitUrlController from '../../../controllers/submitUrlController.js'
import statusController from '../../../controllers/statusController.js'
import resultsController from '../../../controllers/resultsController.js'
import deepLinkController from '../../../controllers/deepLinkController.js'

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
    template: 'check/start.html',
    noPost: true
  },
  '/dataset': {
    ...baseSettings,
    controller: datasetController,
    fields: ['dataset', 'data-subject'],
    checkJourney: false,
    next: [
      { field: 'dataset', fn: requiresGeometryTypeToBeSelected, next: 'geometry-type' },
      'upload-method'
    ],
    backLink: './'
  },
  '/geometry-type': {
    ...baseSettings,
    fields: ['geomType'],
    next: 'upload-method',
    backLink: './dataset',
    checkJourney: false
  },
  '/upload-method': {
    ...baseSettings,
    fields: ['upload-method'],
    next: [
      { field: 'upload-method', op: '===', value: 'url', next: 'url' },
      'upload'
    ],
    backLink: './dataset',
    checkJourney: false
  },
  '/url': {
    ...baseSettings,
    controller: submitUrlController,
    fields: ['url', 'request_id'],
    next: (req, res) => `status/${req.sessionModel.get('request_id')}`,
    backLink: './upload-method',
    checkJourney: false
  },
  '/upload': {
    ...baseSettings,
    controller: uploadFileController,
    fields: ['datafile', 'request_id'],
    next: (req, res) => `status/${req.sessionModel.get('request_id')}`,
    backLink: './upload-method',
    checkJourney: false
  },
  '/status/:id': {
    ...baseSettings,
    template: 'statusPage/status',
    controller: statusController,
    checkJourney: false,
    entryPoint: true,
    next: (req, res) => `results/${req.params.id}/0`
  },
  '/results/:id/:pageNumber': {
    ...baseSettings,
    template: undefined, // as we will dynamically set the template in the controller
    controller: resultsController,
    checkJourney: false,
    entryPoint: true,
    forwardQuery: true,
    fields: ['dataLooksCorrect'],
    next: [
      { field: 'dataLooksCorrect', op: '===', value: 'yes', next: 'confirmation' },
      '/'
    ]
  },
  '/confirmation': {
    ...baseSettings,
    noPost: true,
    checkJourney: false, // ToDo: it would be useful here if we make sure they have selected if their results are ok from the previous step
    template: 'check/confirmation.html'
  },
  // This step allows to fill in some of the required data via query params.
  // This way we can link from a dataset issues page to the Check Tool without
  // the user having to go through the whole process again.
  // This means it doesn't render a page, but redirects the client to the next step
  '/link': {
    ...baseSettings,
    controller: deepLinkController,
    next: [
      { field: 'dataset', fn: requiresGeometryTypeToBeSelected, next: 'geometry-type' },
      'upload-method'
    ],
    entryPoint: true,
    resetJourney: true,
    reset: true,
    skip: true,
    checkJourney: false
  }
}
