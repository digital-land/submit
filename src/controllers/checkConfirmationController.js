import PageController from './pageController.js'

class CheckConfirmationController extends PageController {
  locals (req, res, next) {
    const isUrlCheck = req.sessionModel.get('upload-method') === 'url'
    if (isUrlCheck) {
      const requestId = req.sessionModel.get('request_id')
      req.form.options.requestId = requestId
      req.session.checkRequestId = requestId
    }
    super.locals(req, res, next)
  }
}

export default CheckConfirmationController
