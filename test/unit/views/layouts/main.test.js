import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Main layout tests', () => {
  it('should include the google analytics script if cookies are accepted', () => {
    const html = nunjucks.render('layouts/main.html', { cookiesAccepted: true })

    expect(html).toContain('<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST-CODE"></script>')
  })

  it('should not include the google analytics script if cookies are not accepted', () => {
    const html = nunjucks.render('layouts/main.html', { cookiesAccepted: false })

    expect(html).not.toContain('<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST-CODE"></script>')
  })
})
