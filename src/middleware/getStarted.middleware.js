import { fetchDatasetInfo, fetchOrgInfo, logPageError, prepareAuthority } from './common.middleware.js'
import { renderTemplate } from './middleware.builders.js'

export const getGetStarted = renderTemplate({
  templateParams (req) {
    const { orgInfo: organisation, dataset, authority, entityCount } = req
    return { organisation, dataset, authority, numberOfRecords: entityCount?.entity_count || 0 }
  },
  template: 'organisations/get-started.html',
  handlerName: 'getStarted'
})

export default [
  fetchOrgInfo,
  fetchDatasetInfo,
  prepareAuthority,
  getGetStarted,
  logPageError
]
