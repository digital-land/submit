import PageController from './pageController.js'

class DatasetDetailsController extends PageController {
  locals (req, res, next) {
    const requestId = req.sessionModel.get('requestId')
    if (!requestId) {
      return res.redirect('/check/url')
    }
    super.locals(req, res, next)
  }
}

export default DatasetDetailsController
