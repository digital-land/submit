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
    expect(html).toContain('We could not access this URL automatically. It may be protected by a bot-protection service, such as Cloudflare or Imperva.')
  })
})
