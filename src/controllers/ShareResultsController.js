import PageController from './pageController.js'
import config from '../../config/index.js'

class ShareResultsController extends PageController {
  /* Custom middleware */
  middlewareSetup () {
    super.middlewareSetup()
  }

  async locals (req, res, next) {
    try {
      const { id } = req.params
      const shareLink = this.generateResultsLink(id)

      req.locals = {
        ...req.locals,
        shareLink
      }

      this.options.backLink = this.generateResultsLink(id)
      this.options.backLinkText = 'Back to results'

      Object.assign(req.form.options, req.locals)
      super.locals(req, res, next)
    } catch (error) {
      next(error)
    }
  }

  generateResultsLink (id) {
    return `${config.url}check/results/${id}/0`
  }
}

export default ShareResultsController
