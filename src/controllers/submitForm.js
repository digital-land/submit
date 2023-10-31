'use strict'

const { Controller } = require('hmpo-form-wizard')

class SubmitForm extends Controller {
  saveValues (req, res, next) {
    // const data = {
    //   chosenColor: req.sessionModel.get('color'),
    //   yourAge: req.sessionModel.get('age'),
    //   fullName: req.sessionModel.get('name')
    // }
    // post the data to the api
  }
}

module.exports = SubmitForm
