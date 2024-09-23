import { fetchDatasetInfo, fetchOrgInfo, logPageError } from './common.middleware'
import { renderTemplate } from './middleware.builders'

const getGetStarted = renderTemplate({
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
