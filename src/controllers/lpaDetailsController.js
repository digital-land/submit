import PageController from './pageController.js'
import fetchLocalAuthorities from '../utils/fetchLocalAuthorities.js'

class lpaDetailsController extends PageController {
  async locals (req, res, next) {
    const localAuthorities = await fetchLocalAuthorities()

    const localAuthoritiesNames = localAuthorities.entities.map(lpa => ({
      text: lpa.name,
      value: lpa.name
    }))

    req.form.options.localAuthorities = localAuthoritiesNames

    super.locals(req, res, next)
  }
}

export default lpaDetailsController
