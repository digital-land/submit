import xGovFilters from '@x-govuk/govuk-prototype-filters'

const { govukMarkdown } = xGovFilters

const addFilters = (nunjucksEnv) => {
  nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)

  // some additional filters useful for debugging:
  nunjucksEnv.addFilter('getkeys', function (object) {
    if (Object.prototype.toString.call(object) === '[object Array]') {
      const keys = []
      for (let i = object.length - 1; i >= 0; i--) {
        keys.push(Object.keys(object[i]))
      }
      return keys
    } else {
      return Object.keys(object)
    }
  })

  nunjucksEnv.addGlobal('getContext', function () {
    return this.ctx
  })
}

export default addFilters
