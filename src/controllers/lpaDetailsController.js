import PageController from './pageController.js'
import { fetchLocalAuthorities } from '../utils/datasetteQueries/fetchLocalAuthorities.js'

class LpaDetailsController extends PageController {
  async locals (req, res, next) {
    if (!req.sessionModel?.get('lpa') || !req.sessionModel?.get('dataset')) {
      return res.redirect('/')
    }

    const localAuthoritiesNames = await fetchLocalAuthorities()
    const listItems = localAuthoritiesNames.map(name => ({
      text: name,
      value: name
    }))

    req.form.options.localAuthorities = listItems

    super.locals(req, res, next)
  }
}

export default LpaDetailsController
