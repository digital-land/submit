import { describe, it, expect } from 'vitest'
import hash from '../../src/utils/hasher.js'

describe('hasher', () => {
  it('should return the same hash for the same string', async () => {
    const string = 'test'
    const hash1 = await hash(string)
    const hash2 = await hash(string)
    expect(hash1).toEqual(hash2)
  })

  it('should return the expected value for a given string', async () => {
    const string = 'test'
    const expectedValue = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    const hash1 = await hash(string)
    expect(hash1).toEqual(expectedValue)
  })
})
