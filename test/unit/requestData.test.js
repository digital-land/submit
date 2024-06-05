import RequestData, { pagination } from '../../src/models/requestData'
import { describe, it, expect } from 'vitest'

// Tech Debt: we should write some more tests around the requestData.js file
describe('RequestData', () => {
  describe('getPagination', () => {
    it('should return correct pagination data', () => {
      const instance = {
        pagination: {
          totalResults: 100,
          limit: 10,
          offset: 0
        },
        id: 'test'
      }

      const result = RequestData.prototype.getPagination.call(instance, 5)

      expect(result).toEqual({
        totalResults: 100,
        offset: 0,
        limit: 10,
        currentPage: 6,
        nextPage: 6,
        previousPage: 4,
        totalPages: 10,
        items: [
          { number: 1, href: '/results/test/0', current: false },
          { ellipsis: true, href: '#' },
          { number: 5, href: '/results/test/4', current: false },
          { number: 6, href: '/results/test/5', current: true },
          { number: 7, href: '/results/test/6', current: false },
          { ellipsis: true, href: '#' },
          { number: 10, href: '/results/test/9', current: false }
        ]
      })
    })

    it('should return correct pagination data when on the last page', () => {
      const instance = {
        pagination: {
          totalResults: 100,
          limit: 10,
          offset: 90
        },
        id: 'test'
      }
      const result = RequestData.prototype.getPagination.call(instance, 9)
      expect(result).toEqual({
        totalResults: 100,
        offset: 90,
        limit: 10,
        currentPage: 10,
        nextPage: null,
        previousPage: 8,
        totalPages: 10,
        items: [
          { number: 1, href: '/results/test/0', current: false },
          { ellipsis: true, href: '#' },
          { number: 8, href: '/results/test/7', current: false },
          { number: 9, href: '/results/test/8', current: false },
          { number: 10, href: '/results/test/9', current: true }
        ]
      })
    })

    it('should return correct pagination data when on the first page', () => {
      const instance = {
        pagination: {
          totalResults: 100,
          limit: 10,
          offset: 0
        },
        id: 'test'
      }
      const result = RequestData.prototype.getPagination.call(instance, 0)
      expect(result).toEqual({
        totalResults: 100,
        offset: 0,
        limit: 10,
        currentPage: 1,
        nextPage: 1,
        previousPage: null,
        totalPages: 10,
        items: [
          { number: 1, href: '/results/test/0', current: true },
          { number: 2, href: '/results/test/1', current: false },
          { number: 3, href: '/results/test/2', current: false },
          { ellipsis: true, href: '#' },
          { number: 10, href: '/results/test/9', current: false }
        ]
      })
    })
  })
})

describe('Pagination', () => {
  const testCases = [
    {
      input: {
        count: 1,
        current: 1
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
        count: 10,
        current: 1
      },
      expected: [1, 2, 3, '...', 10]
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
