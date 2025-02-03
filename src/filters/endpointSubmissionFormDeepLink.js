/**
 * Returns the deep link to the endpoint submission form for a given dataset and organisation
 *
 * @param {{name:string}} organisation
 * @param {{dataset:string, name:string}} dataset
 *
 * @return {string}
 */
export function endpointSubmissionFormToolDeepLink (organisation, dataset) {
  return `/submit/link?dataset=${encodeURIComponent(dataset.dataset)}&orgName=${encodeURIComponent(organisation.name)}&orgId=${encodeURIComponent(organisation.organisation)}`
}
