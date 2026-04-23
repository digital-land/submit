'use strict'
import PageController from './pageController.js'

class UploadController extends PageController {
  async get (req, res, next) {
    const organisationName = req?.sessionModel?.get('deep-link-session-key')?.orgName
    const dataset = req?.sessionModel?.get('dataset')
    const collection = req?.sessionModel?.get('data-subject')
    const sessionId = req?.session?.id
    const isEmpty = value => value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
    // How did you get to this page without going through the previous pages in the journey? Let's send you back to the start.
    if ([organisationName, dataset, collection, sessionId].some(isEmpty)) {
      return res.redirect('/')
    }
    super.get(req, res, next)
  }

  async post (req, res, next) {
    super.post(req, res, next)
  }

  getBaseFormData (req) {
    return {
      organisationName: req.sessionModel.get('deep-link-session-key')?.orgName,
      dataset: req.sessionModel.get('dataset'),
      collection: req.sessionModel.get('data-subject'),
      geomType: req.sessionModel.get('geomType'),
      sessionId: req.session.id
    }
  }
}

export default UploadController
