import LpaDetailsController from '../../../controllers/lpaDetailsController.js'
import DatasetDetailsController from '../../../controllers/datasetDetailsController.js'
import PageController from '../../../controllers/pageController.js'
import CheckAnswersController from '../../../controllers/CheckAnswersController.js'

const defaultParams = {
  entryPoint: false,
  controller: PageController
}

export default {
  '/lpa-details': {
    ...defaultParams,
    template: 'submit/lpa-details',
    fields: ['name', 'email'],
    next: 'dataset-details',
    controller: LpaDetailsController,
    checkJourney: false,
    entryPoint: true
  },
  '/dataset-details': {
    ...defaultParams,
    template: 'submit/dataset-details',
    fields: ['documentation-url', 'hasLicence', 'geomType'],
    next: 'check-answers',
    controller: DatasetDetailsController,
    checkJourney: false,
    entryPoint: true
  },
  '/check-answers': {
    ...defaultParams,
    template: 'submit/check-answers',
    controller: CheckAnswersController,
    next: 'confirmation',
    checkJourney: false,
    entryPoint: true
  },
  '/confirmation': {
    ...defaultParams,
    checkJourney: false,
    template: 'submit/confirmation.html'
  }
}
