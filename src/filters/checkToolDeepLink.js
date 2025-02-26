/**
 * Returns the deep link to the check tool for a given dataset and organisation
 *
 * @param {string} organisation
 * @param {string} dataset
 *
 * @return {string}
 */
export function checkToolDeepLink (organisation, dataset) {
  if (!organisation || !dataset) {
    return '/check'
  }
  return `/check/link?dataset=${encodeURIComponent(dataset)}&orgName=${encodeURIComponent(organisation)}&orgId=${encodeURIComponent(organisation)}`
}
