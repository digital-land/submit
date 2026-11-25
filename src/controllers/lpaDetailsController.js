import PageController from './pageController.js'
import { fetchLocalAuthorities } from '../utils/datasetteQueries/fetchLocalAuthorities.js'
import { getRequestData } from '../services/asyncRequestApi.js'
import { orgIdToName } from '../utils/orgIdToName.js'
import { currentUser } from '../services/userIdentity.js'

class LpaDetailsController extends PageController {
  process (req, res, next) {
    const user = currentUser()
    if (user) req.form.values.email = user.email
    super.process(req, res, next)
  }

  async locals (req, res, next) {
    const requestId = req.session?.checkRequestId

    try {
      const requestData = await getRequestData(requestId)
      const params = requestData?.getParams()
      if (params?.type !== 'check_url' || !params.dataset) {
        return res.redirect('/check/url')
      }
      // Populate submit wizard session from the check request params
      const orgId = params.organisationName
      req.sessionModel.set('requestId', requestId)
      req.sessionModel.set('lpa', orgIdToName(orgId))
      req.sessionModel.set('orgId', orgId)
      req.sessionModel.set('dataset', params.dataset)
      req.sessionModel.set('endpoint-url', params.url)
      if (params.geom_type) {
        req.sessionModel.set('geomType', params.geom_type)
      }
    } catch {
      return res.redirect('/check/url')
    }

    const localAuthoritiesNames = await fetchLocalAuthorities()
    req.form.options.localAuthorities = localAuthoritiesNames.map(name => ({
      text: name,
      value: name
    }))

    req.form.options.lastPage = `/check/results/${requestId}/1`

    super.locals(req, res, next)
  }
}

export default LpaDetailsController
