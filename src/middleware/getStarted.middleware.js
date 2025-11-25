import { fetchDatasetInfo, fetchOrgInfo, logPageError, prepareAuthority } from './common.middleware.js'
import { renderTemplate, fetchOne, FetchOptions, FetchOneFallbackPolicy } from './middleware.builders.js'

// Duplication from datasetTaskList due to edits not allowing common milddlware import
export const fetchEntityCount = fetchOne({
  query: ({ req }) => `
    select count(entity) as entity_count
    from entity
    WHERE organisation_entity = '${req.orgInfo.entity}'
  `,
  result: 'entityCount',
  dataset: FetchOptions.fromParams,
  fallbackPolicy: FetchOneFallbackPolicy.continue
})

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
  fetchEntityCount,
  prepareAuthority,
  getGetStarted,
  logPageError
]
