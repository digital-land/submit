import { getkeys, getContext } from './debuggingFilters.js'
import toErrorList from './toErrorList.js'
import validationMessageLookup from './validationMessageLookup.js'
import xGovFilters from '@x-govuk/govuk-prototype-filters'

const { govukMarkdown } = xGovFilters

/**
 *
 * @param {*} dataSubjects
 * @returns {Map<string,string>}
 */
function createDatasetMapping (dataSubjects) {
  const mapping = new Map()
  for (const data of Object.values(dataSubjects)) {
    for (const dataset of data.dataSets) {
      mapping.set(dataset.value, dataset.text)
    }
  }
  return mapping
}

const addFilters = (nunjucksEnv, { dataSubjects }) => {
  nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)
  nunjucksEnv.addFilter('getkeys', getkeys)
  nunjucksEnv.addFilter('getContext', getContext)
  nunjucksEnv.addFilter('toErrorList', toErrorList)
  nunjucksEnv.addFilter('validationMessageLookup', validationMessageLookup)

  const datasetNameMapping = createDatasetMapping(dataSubjects)
  nunjucksEnv.addFilter('datasetSlugToReadableName', function (slug) {
    const name = datasetNameMapping.get(slug)
    if (!name) {
      throw new Error(`Can't find a name for ${slug}`)
    }
    return name
  })
}

export default addFilters
