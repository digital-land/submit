/**
 * Returns the deep link to the check tool for a given dataset and organisation
 *
 * @param {{name:string}} organisation
 * @param {{dataset:string, name:string}} dataset
 *
 * @return {string}
 */
export function checkToolDeepLink (organisation, dataset) {
  return `/check/link?dataset=${encodeURIComponent(dataset.dataset)}&orgName=${encodeURIComponent(organisation.name)}`
}