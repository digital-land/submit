import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Main layout tests', () => {
  it.each([true, false])('does not include third-party analytics scripts when cookiesAccepted is %s', (cookiesAccepted) => {
    const html = nunjucks.render('layouts/main.html', { cookiesAccepted })

    expect(html).not.toContain('googletagmanager.com')
    expect(html).not.toContain('smartlook.com')
  })
})
