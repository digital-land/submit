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
 * @param {{datasetNameMapping, app: object?}} param0
 * @returns
 */
export function setupNunjucks ({ app, datasetNameMapping }) {
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
  }

  Object.keys(globalValues).forEach((key) => {
    nunjucksEnv.addGlobal(key, globalValues[key])
  })
  addFilters(nunjucksEnv, { datasetNameMapping })

  return customNunjucks
}
