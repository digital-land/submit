import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { MiddlewareError } from '../../src/utils/errors.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('render default HTTP error pages', () => {
  const statuses = [400, 404, 500, 503, 504]
  const templateContext = { supportEmail: 'foo@example.com' }

  for (const status of statuses) {
    it(`status ${status}`, () => {
      const err = new MiddlewareError(`Failed with ${status}`, status)
      const page = nunjucks.render(err.template, { err, env: 'local', ...templateContext })
      expect(page).toBeDefined()
      if (status !== 404) {
        expect(page).to.contain('<summary>Error details</summary>')
      }
    })
  }

  it('does not include error detaiils in production', () => {
    const err = new MiddlewareError('Failed in prod', 500)
    const page = nunjucks.render(err.template, { err, env: 'production', ...templateContext })
    expect(page).toBeDefined()
    expect(page).not.to.contain('<summary>Error details</summary>')
  })
})
