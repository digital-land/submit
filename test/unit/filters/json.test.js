import { describe, it, expect } from 'vitest'
import { parseJson } from '../../../src/filters/json.js'

describe('parseJson filter', () => {
  it('should return value for key', () => {
    const result = parseJson('{"id": "mockLpa", "name": "Mock Lpa"}', 'id')
    expect(result).toBe('mockLpa')
  })

  it('should return undefined for an undefined key', () => {
    const result = parseJson('{"id": "mockLpa", "name": "Mock Lpa"}', 'some-other-key')
    expect(result).toBe(undefined)
  })

  it('should return null for invalid json', () => {
    const result = parseJson('invalid-json', 'id')
    expect(result).toBe(null)
  })
})
