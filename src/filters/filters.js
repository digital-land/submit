import { getkeys, getContext } from './debuggingFilters.js'
import xGovFilters from '@x-govuk/govuk-prototype-filters'
import validationMessageLookup from './validationMessageLookup.js'
import toErrorList from './toErrorList.js'
import prettifyColumnName from './prettifyColumnName.js'
import getFullServiceName from './getFullServiceName.js'
import { makeDatasetSlugToReadableNameFilter } from './makeDatasetSlugToReadableNameFilter.js'
import { checkToolDeepLink } from './checkToolDeepLink.js'
import pluralize from 'pluralize'

/** maps dataset status (as returned by `fetchLpaOverview` middleware to a
 * CSS class used by the govuk-tag component
 */
const statusToTagClassMapping = {
  Error: 'govuk-tag--red',
  'Not submitted': 'govuk-tag--grey',
  'Needs fixing': 'govuk-tag--yellow',
  Warning: 'govuk-tag--blue',
  Issue: 'govuk-tag--blue', // deprecated
  Live: 'govuk-tag--green'
}

export function statusToTagClass (status) {
  console.assert(status in statusToTagClassMapping, `statusToTagClass: unknown status ${status}`)
  return statusToTagClassMapping[status]
}

const { govukMarkdown, govukDateTime } = xGovFilters

const addFilters = (nunjucksEnv, { datasetNameMapping }) => {
  const datasetSlugToReadableName = makeDatasetSlugToReadableNameFilter(datasetNameMapping)
  nunjucksEnv.addFilter('datasetSlugToReadableName', datasetSlugToReadableName)

  nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)
  nunjucksEnv.addFilter('govukDateTime', govukDateTime)
  nunjucksEnv.addFilter('getkeys', getkeys)
  nunjucksEnv.addFilter('getContext', getContext)
  nunjucksEnv.addFilter('validationMessageLookup', validationMessageLookup)
  nunjucksEnv.addFilter('toErrorList', toErrorList)
  nunjucksEnv.addFilter('prettifyColumnName', prettifyColumnName)
  nunjucksEnv.addFilter('getFullServiceName', getFullServiceName)
  nunjucksEnv.addFilter('statusToTagClass', statusToTagClass)
  nunjucksEnv.addFilter('pluralise', pluralize)
  nunjucksEnv.addFilter('checkToolDeepLink', checkToolDeepLink)
}

export default addFilters
