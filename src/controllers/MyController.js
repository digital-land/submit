const { Controller } = require('hmpo-form-wizard')

class MyController extends Controller {
  locals (req, res, callback) {
    req.form.options.lastPage = req.journeyModel.get('lastVisited')
    super.locals(req, res, callback)
  }
}

module.exports = MyController
