import { logPageError } from './common.middleware.js'
import { fetchMany, renderTemplate } from './middleware.builders.js'

const fetchOrganisations = fetchMany({
  query: ({ req, params }) => {
    return `
      SELECT
        name,
        organisation
      FROM
        organisation
      WHERE
        (
          organisation LIKE 'local-authority:%'
          OR organisation LIKE 'national-park-authority:%'
        )
        AND (
          end_date IS NULL
          OR end_date = ''
          OR end_date >= current_timestamp
        )
      ORDER BY
        name ASC
    `
  },
  result: 'organisations'
})

/**
 * Middleware. Updates req with `templateParams`.
 *
 * @param {Object} req - Express request object
 * @param {Array<Object>} req.organisations - Array of organisation objects
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
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
