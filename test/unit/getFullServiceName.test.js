// getFullServiceName.test.js
import { vi, it, describe, expect } from 'vitest'

vi.mock('../../config/index.js', () => ({ default: { serviceNames: { myservice: 'MyService Example' } } }))

describe('getFullServiceName', async () => {
  const getFullServiceName = (await vi.importActual('../../src/filters/getFullServiceName.js')).default

  it('returns the full service name for a shorthand name', () => {
    const result = getFullServiceName('myservice')

    expect(result).toBe('MyService Example')
  })

  it('throws an error if service name is not a string', () => {
    expect(() => getFullServiceName(123)).toThrowError('Service name must be a non-empty string')
  })

  it('throws an error if service name is empty', () => {
    expect(() => getFullServiceName('')).toThrowError('Service name must be a non-empty string')
  })

  it('throws an error if service name is null or undefined', () => {
    expect(() => getFullServiceName(null)).toThrowError('Service name must be a non-empty string')
    expect(() => getFullServiceName(undefined)).toThrowError('Service name must be a non-empty string')
  })
})
