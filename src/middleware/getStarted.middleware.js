import { fetchDatasetInfo, fetchLocalPlanningGroups, fetchProvisionsByOrgsAndDatasets, fetchOrgInfo, logPageError, prepareAuthority } from './common.middleware.js'
import { renderTemplate } from './middleware.builders.js'

export const getGetStarted = renderTemplate({
  templateParams (req) {
    const { orgInfo: organisation, dataset, authority, provisions } = req
    const planningGroupProvisions = provisions?.length > 1
      ? provisions.filter(p => p.organisation !== req.params.lpa)
      : []
    return {
      organisation,
      dataset,
      authority,
      planningGroupProvisions: planningGroupProvisions.length > 0 ? planningGroupProvisions : undefined
    }
  },
  template: 'organisations/get-started.html',
  handlerName: 'getStarted'
})

export default [
  fetchOrgInfo,
  fetchLocalPlanningGroups,
  fetchProvisionsByOrgsAndDatasets,
  fetchDatasetInfo,
  prepareAuthority,
  getGetStarted,
  logPageError
]
