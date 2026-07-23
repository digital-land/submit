import { describe, it, expect } from 'vitest'
import * as v from 'valibot'
import { dataviewQueryParams } from '../../../src/middleware/dataview.middleware.js'

// Regression: a non-numeric :pageNumber segment (e.g. /data/abc) used to parse
// to NaN, slip past v.minValue(1), and crash later in getSetDataRange. The
// schema now includes v.integer(), so invalid page numbers are rejected here.
describe('dataviewQueryParams pageNumber', () => {
  const base = { lpa: 'x', dataset: 'y' }

  it('defaults to 1 when absent', () => {
    expect(v.parse(dataviewQueryParams, base).pageNumber).toBe(1)
  })

  it('coerces a valid numeric string to a number', () => {
    expect(v.parse(dataviewQueryParams, { ...base, pageNumber: '3' }).pageNumber).toBe(3)
  })

  it.each(['abc', '', '2.5', '0', '-1'])('rejects invalid pageNumber %j', (pageNumber) => {
    expect(() => v.parse(dataviewQueryParams, { ...base, pageNumber })).toThrow()
  })
})
