'use strict'

import MyController from './MyController.js'

import { validate } from 'email-validator'

class EmailAddressController extends MyController {
  // perform some additional validation on the email address
  validate (req, res, next) {
    if (!validate(req.form.values['email-address'])) {
      const errors = {}
      errors['email-address'] = new this.Error('email-address', {}, req.form.values['email-address'], 'Email address is not valid')
      next(errors)
    } else {
      super.validate(req, res, next)
    }
  }
}

export default EmailAddressController
