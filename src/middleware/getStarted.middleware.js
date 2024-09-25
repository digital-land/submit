import { fetchDatasetInfo, fetchOrgInfo, logPageError } from './common.middleware.js'
import { renderTemplate } from './middleware.builders.js'

export const getGetStarted = renderTemplate({
  templateParams (req) {
    const { orgInfo: organisation, dataset } = req
    return { organisation, dataset }
  },
  template: 'organisations/get-started.html',
  handlerName: 'getStarted'
})

export default [
  fetchOrgInfo,
  fetchDatasetInfo,
  getGetStarted,
  logPageError
]
