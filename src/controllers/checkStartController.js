'use strict'

import PageController from './pageController.js'

class checkStartController extends PageController {
  get (req, res, next) {
    return res.redirect('/')
  }
}

export default checkStartController
