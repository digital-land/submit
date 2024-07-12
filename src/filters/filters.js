import { getkeys, getContext } from './debuggingFilters.js'
import xGovFilters from '@x-govuk/govuk-prototype-filters'
import validationMessageLookup from './validationMessageLookup.js'
import toErrorList from './toErrorList.js'
import prettifyColumnName from './prettifyColumnName.js'
import getFullServiceName from './getFullServiceName.js'
import { makeDatasetSlugToReadableNameFilter, createDatasetMapping } from './makeDatasetSlugToReadableNameFilter.js'

const { govukMarkdown } = xGovFilters



const addFilters = (nunjucksEnv, { dataSubjects }) => {
  const datasetNameMapping = createDatasetMapping(dataSubjects)
  const datasetSlugToReadableName = makeDatasetSlugToReadableNameFilter(datasetNameMapping)
  nunjucksEnv.addFilter('datasetSlugToReadableName', datasetSlugToReadableName)

  nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)
  nunjucksEnv.addFilter('getkeys', getkeys)
  nunjucksEnv.addFilter('getContext', getContext)
  nunjucksEnv.addFilter('validationMessageLookup', validationMessageLookup)
  nunjucksEnv.addFilter('toErrorList', toErrorList)
  nunjucksEnv.addFilter('prettifyColumnName', prettifyColumnName)
  nunjucksEnv.addFilter('getFullServiceName', getFullServiceName)
}

export default addFilters
