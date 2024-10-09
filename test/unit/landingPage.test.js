// ToDo: need to duplicate this test for submit start page

import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './generic-page.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Start View', () => {
  const params = {}
  const html = nunjucks.render('landing.html', params)

  runGenericPageTests(html, {
    // we skip pageTitle since this is the main page, and service name alone is sufficient
  })

  it('should include the google analytics script', () => {
    expect(html).toContain('<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST-CODE"></script>')
  })
})
