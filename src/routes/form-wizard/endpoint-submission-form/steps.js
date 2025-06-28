import LpaDetailsController from '../../../controllers/lpaDetailsController.js'
import PageController from '../../../controllers/pageController.js'
import CheckAnswersController from '../../../controllers/CheckAnswersController.js'
import EndpointSubmissionFormDeepLinkController from '../../../controllers/endpointSubmissionFormDeepLinkController.js'

const defaultParams = {
  entryPoint: false,
  controller: PageController
}

export default {
  '/link': {
    ...defaultParams,
    controller: EndpointSubmissionFormDeepLinkController,
    next: [
      'lpa-details'
    ],
    entryPoint: true,
    resetJourney: true,
    reset: true,
    skip: true,
    checkJourney: false
  },
  '/lpa-details': {
    ...defaultParams,
    fields: ['name', 'email'],
    next: 'dataset-details',
    controller: LpaDetailsController,
    checkJourney: false
  },
  '/dataset-details': {
    ...defaultParams,
    fields: ['endpoint-url', 'documentation-url', 'hasLicence'],
    next: 'check-answers',
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
