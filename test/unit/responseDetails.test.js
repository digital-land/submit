import test from 'node:test'
import { pagination } from '../../src/models/responseDetails'
import { describe, it, expect } from 'vitest'

describe('ResponseDetails', () => {
  // let responseDetails
  // const mockResponse = [] // Fill with mock data
  // const mockPagination = {} // Fill with mock data
  // const mockColumnFieldLog = [] // Fill with mock data

  // beforeEach(() => {
  //   // responseDetails = new ResponseDetails(mockResponse, mockPagination, mockColumnFieldLog)
  // })

  describe('getRows', () => {
    test('returns the rows', () => {
      // TODO: Write test
    })

    test('returns an empty array if there are no rows and logs an error', () => {

    })
  })

  describe('getColumnFieldLog', () => {
    test('returns the column field log', () => {
      // TODO: Write test
    })

    test('returns an empty array if there is no column field log and logs an error', () => {

    })
  })

  describe('getColumns', () => {
    test('returns the columns', () => {

    })

    test('returns an empty array if there are no rows', () => {

    })
  })

  test('getFields', () => {
    // TODO: Write test
  })

  test('getFieldMappings', () => {
    // TODO: Write test
  })

  describe('getRowsWithVerboseColumns', () => {
    test('returns the rows with verbose columns', () => {

    })

    test('returns an empty array if there are no rows and logs an error', () => {

    })
  })

  test('getGeometryKey', () => {
    // TODO: Write test
  })

  test('getGeometries', () => {
    // TODO: Write test
  })

  test('getPagination', () => {
    // TODO: Write test
  })
})

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
