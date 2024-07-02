import { describe } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './generic-page.js'
import config from '../../config/index.js'

const nunjucks = setupNunjucks()

describe('choose dataset View', () => {
  const params = {
    errors: {}
  }
  const html = nunjucks.render('choose-dataset.html', params)

  runGenericPageTests(html, {
    pageTitle: `Choose dataset - ${config.serviceName}`,
    serviceName: config.serviceName
  })
})
