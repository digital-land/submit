import { describe, it, expect, vi } from 'vitest'
import middlewares from '../../../src/middleware/dataset-failed-expectation-details.middleware.js'

const prepareTemplateParams = middlewares.find(middleware => middleware.name === 'prepareTemplateParams')

describe('dataset-failed-expectation-details prepareTemplateParams', () => {
  it('escapes entity values', () => {
    const req = {
      orgInfo: { name: 'Example Council', organisation: 'local-authority:EXA' },
      dataset: { dataset: 'conservation-area', name: 'Conservation area' },
      expectationOutOfBounds: [{ actual: 1 }],
      entity: { entity: 1, name: '<script>bad</script>', json: '{"notes": "a & b"}' },
      dataRange: {},
      pagination: {},
      parsedParams: { pageNumber: 1 }
    }

    prepareTemplateParams(req, {}, vi.fn())

    const values = Object.fromEntries(req.templateParams.entry.fields.map(field => [field.key.text, field.value.html]))
    expect(values.name).toBe('&lt;script&gt;bad&lt;/script&gt;')
    expect(values.notes).toBe('a &amp; b')
    expect(values.entity).toBe('1')
  })
})
