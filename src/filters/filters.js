import { getkeys, getContext } from './debuggingFilters.js'
import xGovFilters from '@x-govuk/govuk-prototype-filters'
import validationMessageLookup from './validationMessageLookup.js'
import toErrorList from './toErrorList.js'
import prettifyColumnName from './prettifyColumnName.js'
import getFullServiceName from './getFullServiceName.js'
import { makeDatasetSlugToReadableNameFilter } from './makeDatasetSlugToReadableNameFilter.js'

/** maps dataset status (as returned by performanceDbApi/getLpaOverview()) to a 
 * CSS class used by the govuk-tag component 
 */
const statusToTagClassMapping = {
  Error: 'govuk-tag--red',
  'Not submitted': 'govuk-tag--red',
  'Needs fixing': 'govuk-tag--yellow',
  Warning: 'govuk-tag--blue',
  Issue: 'govuk-tag--blue', // deprecated
  Live: 'govuk-tag--green'
}

export function statusToTagClass(status) {
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
  nunjucksEnv.addFilter('getFullServiceName', getFullServiceName),
  nunjucksEnv.addFilter('statusToTagClass', statusToTagClass)
}

export default addFilters
