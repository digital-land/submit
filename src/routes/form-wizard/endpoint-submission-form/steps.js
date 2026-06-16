import LpaDetailsController from '../../../controllers/lpaDetailsController.js'
import DatasetDetailsController from '../../../controllers/datasetDetailsController.js'
import PageController from '../../../controllers/pageController.js'
import CheckAnswersController from '../../../controllers/CheckAnswersController.js'

const defaultParams = {
  entryPoint: false,
  controller: PageController
}

// Previously this was a separate form wizard entirely, now the only entry point is from the check wizard.
// TODO: Merge these two wizards together to remove the bridged session.
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
    fields: ['documentation-url', 'hasLicence'],
    next: 'check-answers',
    controller: DatasetDetailsController,
    checkJourney: false,
    backLink: '/lpa-details'
  },
  '/check-answers': {
    ...defaultParams,
    controller: CheckAnswersController,
    next: 'confirmation',
    checkJourney: false,
    backLink: '/dataset-details'
  },
  '/confirmation': {
    ...defaultParams,
    checkJourney: false,
    template: 'submit/confirmation.html'
  }
}
