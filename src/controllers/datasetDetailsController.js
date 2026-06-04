import PageController from './pageController.js'

class DatasetDetailsController extends PageController {
  locals (req, res, next) {
    const requestId = req.sessionModel.get('requestId')
    const dataset = req.sessionModel.get('dataset')
    if (!requestId || !dataset) {
      return res.redirect('/check/url')
    }
    super.locals(req, res, next)
  }

  post (req, res, next) {
    const endpointUrl = req.sessionModel.get('endpoint-url')
    const documentationUrl = (req.body['documentation-url'] ?? '').trim()

    if (endpointUrl && documentationUrl && documentationUrl.toLowerCase() === endpointUrl.toLowerCase()) {
      const errors = {
        'documentation-url': new DatasetDetailsController.Error('documentation-url', { key: 'documentation-url', type: 'sameAsEndpoint' }, req, res)
      }
      return next(errors)
    }

    super.post(req, res, next)
  }
}

export default DatasetDetailsController
