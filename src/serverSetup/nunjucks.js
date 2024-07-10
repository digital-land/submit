import nunjucks from 'nunjucks'
import config from '../../config/index.js'
import addFilters from '../filters/filters.js'

export function setupNunjucks ({ app, dataSubjects }) {
  if (app) {
    app.set('view engine', 'html')
  }

  const nunjucksEnv = nunjucks.configure([
    'src/views',
    'src/views/check',
    'src/views/submit',
    'node_modules/govuk-frontend/dist/',
    'node_modules/@x-govuk/govuk-prototype-components/'
  ], {
    express: app,
    dev: true,
    noCache: true,
    watch: true
  })

  const globalValues = {
    serviceName: config.serviceName,
    feedbackLink: config.feedbackLink
  }

  Object.keys(globalValues).forEach((key) => {
    nunjucksEnv.addGlobal(key, globalValues[key])
  })
  addFilters(nunjucksEnv, { dataSubjects })

  return nunjucks
}
