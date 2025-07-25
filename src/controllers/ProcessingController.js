import PageController from './pageController.js'

class ProcessingController extends PageController {
  get (req, res, next) {
    const requestId = req.params.id
    req.form.options.requestId = requestId
    req.form.options.pollingEndpoint = `/api/status/${requestId}`
    req.form.options.confirmationUrl = '/submit/confirmation'
    req.form.options.processingComplete = false
    req.form.options.headingTexts = {
      checking: 'We are processing your submission',
      checked: 'Processing complete'
    }
    req.form.options.messageTexts = {
      checking: 'Please wait while we check your submission.',
      checked: 'Your submission has been processed.'
    }

    super.get(req, res, next)
  }
}

export default ProcessingController
