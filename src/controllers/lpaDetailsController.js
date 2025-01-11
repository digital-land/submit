import PageController from './pageController.js'
import { fetchLocalAuthoritiesWithIdAndName } from '../utils/datasetteQueries/fetchLocalAuthorities.js'

class LpaDetailsController extends PageController {
  async locals (req, res, next) {
    const localAuthorities = await fetchLocalAuthoritiesWithIdAndName()
    req.form.options.localAuthorities = localAuthorities.map(localAuthority => ({
      text: localAuthority.name,
      value: JSON.stringify(localAuthority)
    }))

    super.locals(req, res, next)
  }
}

export default LpaDetailsController
