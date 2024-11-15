import { logPageError } from './common.middleware.js'
import { fetchMany, renderTemplate } from './middleware.builders.js'

const fetchOrganisations = fetchMany({
  query: ({ req, params }) => {
    return `
      select name, organisation
      from organisation
      WHERE organisation like '%local-authority%' OR organisation like '%national-park-authority%'
      ORDER BY name asc
    `
  },
  result: 'organisations'
})

/**
 * Middleware. Updates req with `templateParams`.
 *
 * @param {{ organisations: {}[] }} req
 * @param {*} res
 * @param {*} next
 */
export const prepareGetOrganisationsTemplateParams = (req, res, next) => {
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

export const getOrganisations = renderTemplate({
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
