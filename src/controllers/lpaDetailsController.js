import PageController from './pageController.js'
import { fetchLocalAuthorities } from '../utils/datasetteQueries/fetchLocalAuthorities.js'
import { getRequestData } from '../services/asyncRequestApi.js'

class LpaDetailsController extends PageController {
  async locals (req, res, next) {
    const requestId = req.session?.checkRequestId

    try {
      const requestData = await getRequestData(requestId)
      if (requestData?.getParams()?.type !== 'check_url') {
        return res.redirect('/check/url')
      }
      const params = requestData.getParams()
      req.sessionModel.set('requestId', requestId)
      req.sessionModel.set('lpa', params.organisationName)
      req.sessionModel.set('dataset', params.dataset)
    } catch {
      return res.redirect('/check/url')
    }

    const localAuthoritiesNames = await fetchLocalAuthorities()
    req.form.options.localAuthorities = localAuthoritiesNames.map(name => ({
      text: name,
      value: name
    }))

    super.locals(req, res, next)
  }
}

export default LpaDetailsController
