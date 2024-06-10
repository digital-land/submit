import xGovFilters from '@x-govuk/govuk-prototype-filters'

const { govukMarkdown } = xGovFilters

const addFilters = (nunjucksEnv) => {
  nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)
}

export default addFilters
