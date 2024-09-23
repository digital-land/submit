import { logPageError } from './common.middleware'
import { fetchMany, renderTemplate } from './middleware.builders'

const fetchOrganisations = fetchMany({
  query: ({ req, params }) => 'select name, organisation from organisation',
  result: 'organisations'
})

/**
 * Middleware. Updates req with `templateParams`.
 *
 * @param {{ organisations: {}[] }} req
 * @param {*} res
 * @param {*} next
 */
const prepareGetOrganisationsTemplateParams = (req, res, next) => {
  const sortedResults = req.organisations.sort((a, b) => {
    return a.name.localeCompare(b.name)
  })

  const alphabetisedOrgs = sortedResults.reduce((acc, current) => {
    const firstLetter = current.name.charAt(0).toUpperCase()
    acc[firstLetter] = acc[firstLetter] || []
    acc[firstLetter].push(current)
    return acc
  }, {})

  req.templateParams = { alphabetisedOrgs }

  next()
}

const getOrganisations = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/find.html',
  handlerName: 'getOrganisations'
})

export default [
  fetchOrganisations,
  prepareGetOrganisationsTemplateParams,
  getOrganisations,
  logPageError
]
