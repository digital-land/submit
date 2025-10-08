'use strict'
import PageController from './pageController.js'

class UploadController extends PageController {
  async post (req, res, next) {
    super.post(req, res, next)
  }

  getBaseFormData (req) {
    const selectedPlugin = req.body.plugin || null
    return {
      dataset: req.sessionModel.get('dataset'),
      collection: req.sessionModel.get('data-subject'),
      geomType: req.sessionModel.get('geomType'),
      sessionId: req.session.id,
      plugin: selectedPlugin
    }
  }
}

export default UploadController
