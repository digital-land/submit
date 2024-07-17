import { getkeys, getContext } from './debuggingFilters.js'
import validationMessageLookup from './validationMessageLookup.js'
import toErrorList from './toErrorList.js'
import prettifyColumnName from './prettifyColumnName.js'
import getFullServiceName from './getFullServiceName.js'

// import xGovFilters from '@x-govuk/govuk-prototype-filters'
// const { govukMarkdown } = xGovFilters

// govuk markdown has a bug in it, until that is resolved we will build the filter here instead

import markedGovukMarkdown from 'govuk-markdown'
import { markedSmartypants } from 'marked-smartypants'
import { normalize } from '@x-govuk/govuk-prototype-filters/lib/utils.js'
import { marked } from 'marked'

const govukMarkdown = (string, kwargs) => {
  string = normalize(string, '')

  marked.default = {}

  marked.use(
    markedGovukMarkdown({
      headingsStartWith: 'm',
    })
  )
  
  marked.use(markedSmartypants())

  return marked(string)
}



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
  const datasetNameMapping = createDatasetMapping(dataSubjects)
  nunjucksEnv.addFilter('datasetSlugToReadableName', function (slug) {
    const name = datasetNameMapping.get(slug)
    if (!name) {
      throw new Error(`Can't find a name for ${slug}`)
    }
    return name
  })

  nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)
  nunjucksEnv.addFilter('getkeys', getkeys)
  nunjucksEnv.addFilter('getContext', getContext)
  nunjucksEnv.addFilter('validationMessageLookup', validationMessageLookup)
  nunjucksEnv.addFilter('toErrorList', toErrorList)
  nunjucksEnv.addFilter('prettifyColumnName', prettifyColumnName)
  nunjucksEnv.addFilter('getFullServiceName', getFullServiceName)
}

export default addFilters
