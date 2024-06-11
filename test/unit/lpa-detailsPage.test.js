import { describe } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './generic-page.js'
import config from '../../config/index.js'

const nunjucks = setupNunjucks()

describe('Lpa-details View', () => {
  const params = {}
  const html = nunjucks.render('lpa-details.html', params)

  runGenericPageTests(html, {
    pageTitle: `Lpa details – ${config.serviceName}`,
    serviceName: config.serviceName
  })
})
