import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('check URL page', () => {
  it('explains that bot protection can cause a 403 error', () => {
    const html = nunjucks.render('check/url.html', {
      errors: { url: { type: 'restricted403' } },
      options: {},
      data: { check: { url: '' } }
    })

    expect(html).toContain('bot protection, such as Cloudflare or Imperva')
    expect(html).toContain('The URL must be accessible')
  })
})
