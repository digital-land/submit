import hmpoFormWizard from 'hmpo-form-wizard'
const { Controller } = hmpoFormWizard

class MyController extends Controller {
  locals (req, res, callback) {
    req.form.options.lastPage = req.journeyModel.get('lastVisited')
    super.locals(req, res, callback)
  }
}

export default MyController
