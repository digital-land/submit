/**
 * Returns the deep link to the endpoint submission form for a given dataset and organisation
 *
 * @param {string} organisation
 * @param {string} dataset
 *
 * @return {string}
 */
export function endpointSubmissionFormToolDeepLink (organisation, dataset) {
  if (!organisation || !dataset) {
    return '/submit'
  }
  return `/submit/link?dataset=${encodeURIComponent(dataset)}&orgName=${encodeURIComponent(organisation)}&orgId=${encodeURIComponent(organisation.organisation)}`
}
