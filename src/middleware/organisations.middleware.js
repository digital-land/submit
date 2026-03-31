import { logPageError } from './common.middleware.js'
import { fetchMany, onlyIf, renderTemplate } from './middleware.builders.js'
import { setOrganisationList, getOrganisationList } from '../utils/redisLoader.js'
import logger from '../utils/logger.js'
import config from '../../config/index.js'

const fetchOrganisations = fetchMany({
  query: ({ req, params }) => `
    SELECT DISTINCT
      p.organisation,
      o.name,
      o.dataset
    FROM
      provision p
      LEFT JOIN organisation o ON p.organisation = o.organisation
    WHERE
      (
        ${config.organisationTypes.map(type => `p.organisation LIKE '${type}:%'`).join('\n        OR ')}
      )
      AND (
        p.end_date IS NULL
        OR p.end_date = ''
        OR p.end_date >= CURRENT_TIMESTAMP
      )
      AND (
        p.provision_reason IN (${config.provisionReasons.map(reason => `'${reason}'`).join(', ')})
      );
  `,
  result: 'organisations'
})

// Try to load organisations from Redis cache, if available to avoid LEFT JOIN Operation
export const loadOrganisations = async (req, res, next) => {
  try {
    const cached = await getOrganisationList()
    if (cached) {
      req.organisations = cached
      req.cached = true
    }
  } catch (e) {
    logger.warn('Error loading organisations from cache', e)
  }
  next()
}

export const saveOrganisations = async (req, res, next) => {
  if (req.organisations) {
    try {
      await setOrganisationList(req.organisations)
    } catch (e) {
      logger.warn('Error setting organisations cache', e)
    }
  }
  next()
}

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

  const orgsByDataset = sortedResults.reduce((acc, current) => {
    const datasetKey = current.dataset || 'other'
    acc[datasetKey] = acc[datasetKey] || []
    acc[datasetKey].push(current)
    return acc
  }, {})

  req.templateParams = { orgsByDataset }

  next()
}

export const getOrganisations = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/find.html',
  handlerName: 'getOrganisations'
})

export default [
  loadOrganisations,
  onlyIf(req => !req.cached, fetchOrganisations),
  onlyIf(req => !req.cached, saveOrganisations),
  prepareGetOrganisationsTemplateParams,
  getOrganisations,
  logPageError
]
