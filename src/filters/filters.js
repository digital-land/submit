import { getkeys, getContext } from './debuggingFilters.js'
import toErrorList from './toErrorList.js'
import validationMessageLookup from './validationMessageLookup.js'
import xGovFilters from '@x-govuk/govuk-prototype-filters'

const { govukMarkdown } = xGovFilters

const addFilters = (nunjucksEnv) => {
  nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)
  nunjucksEnv.addFilter('getkeys', getkeys)
  nunjucksEnv.addFilter('getContext', getContext)
  nunjucksEnv.addFilter('toErrorList', toErrorList)
  nunjucksEnv.addFilter('validationMessageLookup', validationMessageLookup)
}

export default addFilters
