import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('render default HTTP error pages', () => {
  const statuses = ['400', '404', '500', '503', '504']

  for (const status of statuses) {
    it(`status ${status}`, () => {
      const page = nunjucks.render(`errorPages/${status}.html`, {})
      expect(page).toBeDefined()
    })
  }
})
