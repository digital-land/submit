import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Google Analytics JS', () => {
  const params = {}
  const html = nunjucks.render('common/google-analytics.js', params)

  it('should include the google analytics script', () => {
    expect(html).toContain('gtag(\'config\', \'G-TEST-CODE\')')
  })
})
