import xGovFilters from '@x-govuk/govuk-prototype-filters'
import validationMessageLookup from './validationMessageLookup.js'
import toErrorList from './toErrorList.js'
import prettifyColumnName from './prettifyColumnName.js'

const { govukMarkdown } = xGovFilters

const addFilters = (nunjucksEnv) => {
    nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)
    nunjucksEnv.addFilter('validationMessageLookup', validationMessageLookup)
    nunjucksEnv.addFilter('toErrorList', toErrorList)
    nunjucksEnv.addFilter('prettifyColumnName', prettifyColumnName)
}

export default addFilters