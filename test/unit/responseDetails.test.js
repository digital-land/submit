import ResponseDetails, { pagination } from '../../src/models/responseDetails'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import logger from '../../src/utils/logger.js'

vi.mock('../../src/utils/getVerboseColumns.js', () => {
  return {
    getVerboseColumns: vi.fn((row, columnFieldLog) => {
      return { row, columnFieldLog }
    })
  }
})

describe('ResponseDetails', () => {
  const mockResponse = [
    {
      issue_logs: [],
      entry_number: 1,
      converted_row: {
        id: '4',
        wkt: 'POINT (423432.0000000000000000 564564.0000000000000000)',
        name: 'South Jesmond',
        Layer: 'Conservation Area',
        'area(ha)': '35.4',
        geometry: 'POINT (423432.0000000000000000 564564.0000000000000000)',
        'entry-date': '04/04/2025',
        'start-date': '04/04/2024',
        'documentation-url': 'www.example.com'
      }
    },
    {
      issue_logs: [],
      entry_number: 2,
      converted_row: {
        id: '5',
        wkt: 'POINT (423432.0000000000000000 564564.0000000000000000)',
        name: 'North Jesmond',
        Layer: 'Conservation Area',
        'area(ha)': '35.4',
        geometry: 'POINT (423432.0000000000000000 564564.0000000000000000)',
        'entry-date': '04/04/2025',
        'start-date': '04/04/2024',
        'documentation-url': 'www.example.com'
      }
    }
  ]

  const mockPagination = {
    totalResults: 2,
    offset: 0,
    limit: 50
  }

  const mockColumnFieldLog = [
    { column: 'id', field: 'ID' },
    { column: 'wkt', field: 'WKT' },
    { column: 'name', field: 'Name' },
    { column: 'Layer', field: 'Layer' },
    { column: 'area(ha)', field: 'Area' },
    { column: 'geometry', field: 'Geometry' },
    { column: 'entry-date', field: 'Entry Date' },
    { column: 'start-date', field: 'Start Date' },
    { column: 'documentation-url', field: 'Documentation URL' }
  ]

  vi.mock('../utils/logger.js', () => {
    return {
      default: {
        error: vi.fn()
      }
    }
  })

  const loggerErrorSpy = vi.spyOn(logger, 'error')

  beforeEach(() => {
    loggerErrorSpy.mockClear()
  })

  describe('getRows', () => {
    it('returns the rows', () => {
      const responseDetails = new ResponseDetails(undefined, mockResponse, mockPagination, mockColumnFieldLog)
      const result = responseDetails.getRows()
      expect(result).toBe(mockResponse)
    })

    it('returns an empty array if there are no rows and logs an error', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, undefined)
      const result = responseDetails.getRows()
      expect(result).toStrictEqual([])
      expect(loggerErrorSpy).toHaveBeenCalled()
    })
  })

  describe('getColumnFieldLog', () => {
    it('returns the column field log', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, mockColumnFieldLog)
      const result = responseDetails.getColumnFieldLog()
      expect(result).toStrictEqual(mockColumnFieldLog)
    })

    it('returns an empty array if there is no column field log and logs an error', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, undefined)
      const result = responseDetails.getColumnFieldLog()
      expect(result).toStrictEqual([])
      expect(loggerErrorSpy).toHaveBeenCalled()
    })
  })

  describe('getFields', () => {
    it('returns the unique fields from the column keys', () => {
      const responseDetails = new ResponseDetails(undefined, mockResponse, mockPagination, mockColumnFieldLog)
      const result = responseDetails.getFields()
      const expected = ['ID', 'WKT', 'Name', 'Layer', 'Area', 'Geometry', 'Entry Date', 'Start Date', 'Documentation URL']
      expect(result).toEqual(expected)
    })
  })

  describe('getColumns', () => {
    it('returns the columns', () => {
      const responseDetails = new ResponseDetails(undefined, mockResponse, mockPagination, mockColumnFieldLog)
      responseDetails.getFields = vi.fn(() => ['ID', 'WKT', 'Name', 'Layer', 'Area', 'Geometry', 'Entry Date', 'Start Date', 'Documentation URL'])
      const result = responseDetails.getColumns()
      expect(result).toEqual(['id', 'wkt', 'name', 'Layer', 'area(ha)', 'geometry', 'entry-date', 'start-date', 'documentation-url'])
    })

    it('returns an empty array if there are no rows', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, undefined)
      const result = responseDetails.getColumns()
      expect(result).toStrictEqual([])
    })
  })

  it('getFieldMappings', () => {
    const responseDetails = new ResponseDetails(undefined, mockResponse, mockPagination, mockColumnFieldLog)
    const result = responseDetails.getFieldMappings()
    const expected = {
      ID: 'id',
      WKT: 'wkt',
      Name: 'name',
      Layer: 'Layer',
      Area: 'area(ha)',
      Geometry: 'geometry',
      'Entry Date': 'entry-date',
      'Start Date': 'start-date',
      'Documentation URL': 'documentation-url'
    }
    expect(result).toEqual(expected)
  })

  describe('getRowsWithVerboseColumns', () => {
    it('returns the rows with verbose columns', () => {
      const responseDetails = new ResponseDetails(undefined, mockResponse, mockPagination, mockColumnFieldLog)
      const result = responseDetails.getRowsWithVerboseColumns()
      const expected = [
        {
          entryNumber: 1,
          hasErrors: false,
          columns: { row: mockResponse[0], columnFieldLog: mockColumnFieldLog }
        },
        {
          entryNumber: 2,
          hasErrors: false,
          columns: { row: mockResponse[1], columnFieldLog: mockColumnFieldLog }
        }
      ]
      expect(result).toStrictEqual(expected)
    })

    it('returns the rows with verbose columns and filters out non-errors', () => {
      const errorRow = {
        issue_logs: [
          {
            message: 'a made up issue with this row',
            severity: 'error'
          }
        ],
        entry_number: 3,
        converted_row: {
          id: '4',
          wkt: 'POINT (423432.0000000000000000 564564.0000000000000000)',
          name: 'South Jesmond',
          Layer: 'Conservation Area',
          'area(ha)': '35.4',
          geometry: 'POINT (423432.0000000000000000 564564.0000000000000000)',
          'entry-date': '04/04/2025',
          'start-date': '04/04/2024',
          'documentation-url': 'www.example.com'
        }
      }
      const _mockResponse = [
        ...mockResponse,
        errorRow
      ]
      const responseDetails = new ResponseDetails(undefined, _mockResponse, mockPagination, mockColumnFieldLog)
      const result = responseDetails.getRowsWithVerboseColumns(true)
      const expected = [
        {
          entryNumber: 3,
          hasErrors: true,
          columns: { row: errorRow, columnFieldLog: mockColumnFieldLog }
        }
      ]
      expect(result).toStrictEqual(expected)
    })

    it('returns an empty array if there are no rows and logs an error', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, undefined)
      const result = responseDetails.getRowsWithVerboseColumns()
      expect(result).toStrictEqual([])
      expect(loggerErrorSpy).toHaveBeenCalled()
    })
  })

  describe('getGeometryKey', () => {
    it('returns the column for "point" field', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, [
        { column: 'id', field: 'ID' },
        { column: 'wkt', field: 'WKT' },
        { column: 'point', field: 'point' },
        { column: 'name', field: 'Name' }
      ])
      const result = responseDetails.getGeometryKey()
      expect(result).toBe('point')
    })

    it('returns the column for "geometry" field', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, [
        { column: 'id', field: 'ID' },
        { column: 'wkt', field: 'WKT' },
        { column: 'geometry', field: 'geometry' },
        { column: 'name', field: 'Name' }
      ])
      const result = responseDetails.getGeometryKey()
      expect(result).toBe('geometry')
    })

    it('returns null if columnFieldLog is undefined', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, undefined)
      const result = responseDetails.getGeometryKey()
      expect(result).toBeNull()
    })

    it('returns null if no columnFieldEntry is found', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, [
        { column: 'id', field: 'ID' },
        { column: 'wkt', field: 'WKT' },
        { column: 'name', field: 'Name' }
      ])
      const result = responseDetails.getGeometryKey()
      expect(result).toBeNull()
    })
  })

  describe('getGeometries', () => {
    it('returns undefined and logs an error if there is no response', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, undefined)
      const result = responseDetails.getGeometries()
      expect(result).toBeUndefined()
      expect(loggerErrorSpy).toHaveBeenCalled()
    })

    it('returns null if there are no geometries', () => {
      const responseDetails = new ResponseDetails(undefined, [], undefined, undefined)
      const result = responseDetails.getGeometries()
      expect(result).toBeNull()
    })

    it('returns an array of geometries', () => {
      const mockColumnFieldLog = [
        { column: 'id', field: 'ID' },
        { column: 'wkt', field: 'WKT' },
        { column: 'geometry', field: 'geometry' },
        { column: 'name', field: 'Name' }
      ]
      const responseDetails = new ResponseDetails(undefined, mockResponse, undefined, mockColumnFieldLog)
      const result = responseDetails.getGeometries()
      const expected = [
        'POINT (423432.0000000000000000 564564.0000000000000000)',
        'POINT (423432.0000000000000000 564564.0000000000000000)'
      ]
      expect(result).toEqual(expected)
    })
  })

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

      const result = ResponseDetails.prototype.getPagination.call(instance, 5)

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
      const result = ResponseDetails.prototype.getPagination.call(instance, 9)
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
      const result = ResponseDetails.prototype.getPagination.call(instance, 0)
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
