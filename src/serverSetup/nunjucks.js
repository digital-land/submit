import nunjucks from 'nunjucks'
import config from '../../config/index.js'
import addFilters from '../filters/filters.js'
import logger from '../utils/logger.js'
import * as customRenderer from '../utils/custom-renderer.js'
import * as schemas from '../routes/schemas.js'
import * as v from 'valibot'

/**
 * We wanto to override nunjucks.render() with a function that
 * validates the params against a schema.
 */
const proto = {
  render (name, context) {
    const schema = schemas.templateSchema.get(name)
    logger.info(`rendering: ${name} with schema=<${schema ? 'defined' : 'any'}>`)
    return customRenderer.render(nunjucks, name, schema ?? v.any(), context)
  },
  renderString (string, context) {
    return nunjucks.renderString(string, context)
  },
  configure (paths, options) {
    return nunjucks.configure(paths, options)
  }
}

/**
 *
 * @param {Object} opts
 * @param {Map<string, *>} opts.datasetNameMapping mapping
 * @param {Object} [opts.app] express app
 * @returns
 */
export function setupNunjucks (opts) {
  const { app, datasetNameMapping } = opts
  const options = { dev: true, noCache: true, watch: true }
  if (app) {
    options.express = app
  }

  const customNunjucks = Object.create(proto)
  const nunjucksEnv = customNunjucks.configure([
    'src/views',
    'src/views/check',
    'src/views/submit',
    'node_modules/govuk-frontend/dist/',
    'node_modules/@x-govuk/govuk-prototype-components/'
  ], options)

  if (app) {
    app.set('view engine', 'html')
    app.use((req, res, next) => {
      const sanitizedPath = req.path.replace(/[<>'"]/g, '')
      nunjucksEnv.addGlobal('currentPath', sanitizedPath)
      next()
    })
  }

  const globalValues = {
    serviceName: config.serviceNames.submit,
    ...config.templateContent
  }

  if ('smartlook' in config) {
    globalValues.smartlookKey = config.smartlook.key
    globalValues.smartlookRegion = config.smartlook.region
  }

  if ('googleAnalytics' in config) {
    globalValues.googleAnalyticsMeasurementId = config.googleAnalytics.measurementId

    if (app) {
      app.use((req, res, next) => {
        nunjucksEnv.addGlobal('cookiesAccepted', req.cookies.cookies_preferences_set === 'true')
        next()
      })
    }
  }

  Object.keys(globalValues).forEach((key) => {
    nunjucksEnv.addGlobal(key, globalValues[key])
  })
  addFilters(nunjucksEnv, { datasetNameMapping })

  return customNunjucks
}
