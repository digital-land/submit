import chooseDatasetController from '../../controllers/chooseDatasetController.js'
import PageController from '../../controllers/pageController.js'
import CheckAnswersController from '../../controllers/CheckAnswersController.js'

const defaultParams = {
  entryPoint: false,
  controller: PageController
}

export default {
  '/start': {
    ...defaultParams,
    entryPoint: true,
    resetJourney: true,
    noPost: true,
    next: 'lpa-details'
  },
  '/lpa-details': {
    ...defaultParams,
    fields: ['lpa', 'name', 'email'],
    next: 'choose-dataset',
    backLink: '/start'
  },
  '/choose-dataset': {
    ...defaultParams,
    fields: ['dataset'],
    next: 'dataset-details',
    controller: chooseDatasetController,
    backLink: '/lpa-details'
  },
  '/dataset-details': {
    ...defaultParams,
    fields: ['endpoint-url', 'documentation-url', 'hasLicence'],
    next: 'check-answers',
    backLink: '/choose-dataset'
  },
  '/check-answers': {
    ...defaultParams,
    controller: CheckAnswersController,
    next: 'confirmation',
    backLink: '/dataset-details'
  },
  '/confirmation': {
    ...defaultParams
  }
}
