import PageController from './pageController.js'
import { fetchLocalAuthorities } from '../utils/fetchLocalAuthorities.js'

class LpaDetailsController extends PageController {
  async locals (req, res, next) {
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
