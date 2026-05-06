/**
 * Returns the deep link to the endpoint submission form for a given dataset and organisation
 *
 * @param {{name:string, organisation:string}} organisation
 * @param {{dataset:string}} dataset
 * @param {string} [requestId]
 *
 * @return {string}
 */
export function endpointSubmissionFormToolDeepLink (organisation, dataset, requestId) {
  if (!organisation || !dataset) {
    return '/submit'
  }
  const url = `/submit/link?dataset=${encodeURIComponent(dataset.dataset)}&orgName=${encodeURIComponent(organisation.name)}&orgId=${encodeURIComponent(organisation.organisation)}`
  return requestId ? `${url}&requestId=${encodeURIComponent(requestId)}` : url
}
