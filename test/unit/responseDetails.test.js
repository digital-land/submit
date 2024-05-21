import { pagination } from '../../src/models/responseDetails'
import { describe, it, expect } from 'vitest'

describe('Pagination', () => {
  const testCases = [
    {
      input: {
        count: 1,
        current: 0
      },
      expected: [1]
    },
    {
      input: {
        count: 5,
        current: 3
      },
      expected: [1, 2, 3, 4, 5]
    },
    {
      input: {
        count: 6,
        current: 2
      },
      expected: [1, 2, 3, '...', 6]
    },
    {
      input: {
        count: 6,
        current: 5
      },
      expected: [1, '...', 4, 5, 6]
    },
    {
      input: {
        count: 10,
        current: 5
      },
      expected: [1, '...', 4, 5, 6, '...', 10]
    }
  ]

  testCases.forEach((testCase, index) => {
    it(`should return the expected pagination for test case ${index + 1}`, () => {
      const { input, expected } = testCase
      const result = pagination(input.count, input.current)
      expect(result).toEqual(expected)
    })
  })
})
