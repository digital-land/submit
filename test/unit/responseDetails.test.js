import ResponseDetails from '../../src/models/responseDetails.js'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import axios from 'axios'

vi.mock('axios')

vi.mock('../../src/utils/getVerboseColumns.js', () => {
  return {
    getVerboseColumns: vi.fn((row, columnFieldLog) => {
      return { row, columnFieldLog }
    })
  }
})

describe('ResponseDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
      },
      transformed_row: [
        { field: 'point', value: 'POINT (423432.0000000000000000 564564.0000000000000000)' }
      ]
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
      },
      transformed_row: [
        { field: 'point', value: 'POINT (423432.0000000000000000 564564.0000000000000000)' }
      ]
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

  describe('getRows', () => {
    it('returns the rows', () => {
      const responseDetails = new ResponseDetails(undefined, mockResponse, mockPagination, mockColumnFieldLog)
      const result = responseDetails.getRows()
      expect(result).toBe(mockResponse)
    })

    it('returns an empty array if there are no rows', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, undefined)
      const result = responseDetails.getRows()
      expect(result).toStrictEqual([])
    })
  })

  describe('getColumnFieldLog', () => {
    it('returns the column field log', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, mockColumnFieldLog)
      const result = responseDetails.getColumnFieldLog()
      expect(result).toStrictEqual(mockColumnFieldLog)
    })

    it('returns an empty array if there is no column field log', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, undefined)
      const result = responseDetails.getColumnFieldLog()
      expect(result).toStrictEqual([])
    })
  })

  describe('getFields', () => {
    it('returns the unique fields from the column keys', () => {
      const responseDetails = new ResponseDetails(undefined, mockResponse, mockPagination, mockColumnFieldLog)
      const result = responseDetails.getFields()
      const expected = ['id', 'wkt', 'name', 'Layer', 'area(ha)', 'geometry', 'entry-date', 'start-date', 'documentation-url']
      expect(result).toEqual(expected)
    })
    it('returns the unique fields from the column keys and field log', () => {
      const responseDetails = new ResponseDetails(undefined, mockResponse, mockPagination, [{ column: 'foo', field: 'FOO' }])
      const result = responseDetails.getFields()
      const expected = ['id', 'wkt', 'name', 'Layer', 'area(ha)', 'geometry', 'entry-date', 'start-date', 'documentation-url', 'FOO']
      expect(result).toEqual(expected)
    })
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

    it('returns an empty array if there are no rows', () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, undefined)
      const result = responseDetails.getRowsWithVerboseColumns()
      expect(result).toStrictEqual([])
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
    it('returns undefined if there is no request id', async () => {
      const responseDetails = new ResponseDetails(undefined, undefined, undefined, undefined)
      const result = await responseDetails.getGeometries()

      expect(result).toBeUndefined()
      expect(axios.get).not.toHaveBeenCalled()
    })

    it('returns undefined if there are no geometries', async () => {
      axios.get.mockResolvedValueOnce({
        headers: {},
        data: []
      })
      const responseDetails = new ResponseDetails(1, [], undefined, undefined)
      const result = await responseDetails.getGeometries()

      expect(result).toBeUndefined()
    })

    it('caches empty geometry responses', async () => {
      axios.get.mockResolvedValueOnce({
        headers: {},
        data: []
      })
      const responseDetails = new ResponseDetails(1, [], undefined, undefined)

      await responseDetails.getGeometries()
      const result = await responseDetails.getGeometries()

      expect(result).toBeUndefined()
      expect(axios.get).toHaveBeenCalledTimes(1)
    })

    it('returns geometry-only endpoint data', async () => {
      axios.get.mockResolvedValueOnce({
        headers: {},
        data: [
          'POINT (423432.0000000000000000 564564.0000000000000000)',
          'POINT (423432.0000000000000000 564564.0000000000000000)'
        ]
      })
      const responseDetails = new ResponseDetails(1, mockResponse, undefined, undefined)
      const result = await responseDetails.getGeometries()
      const expected = [
        'POINT (423432.0000000000000000 564564.0000000000000000)',
        'POINT (423432.0000000000000000 564564.0000000000000000)'
      ]

      expect(result).toEqual(expected)
      expect(axios.get).toHaveBeenCalledWith(
        new URL('http://localhost:8001/requests/1/geometries'),
        { timeout: 30000 }
      )
    })

    it('fetches paginated geometry-only endpoint data', async () => {
      axios.get
        .mockResolvedValueOnce({
          headers: {
            'x-pagination-total-results': 3,
            'x-pagination-limit': 2
          },
          data: ['POINT (1 2)', 'POINT (3 4)']
        })
        .mockResolvedValueOnce({
          headers: {},
          data: ['POINT (5 6)']
        })

      const responseDetails = new ResponseDetails(1, mockResponse, undefined, undefined)
      const result = await responseDetails.getGeometries()

      expect(result).toEqual(['POINT (1 2)', 'POINT (3 4)', 'POINT (5 6)'])
      expect(axios.get).toHaveBeenCalledWith(
        new URL('http://localhost:8001/requests/1/geometries?offset=2&limit=2'),
        { timeout: 30000 }
      )
    })

    it('caches geometry-only endpoint data', async () => {
      axios.get.mockResolvedValueOnce({
        headers: {},
        data: ['POINT (1 2)']
      })
      const responseDetails = new ResponseDetails(1, mockResponse, undefined, undefined)

      await responseDetails.getGeometries()
      const result = await responseDetails.getGeometries()

      expect(result).toEqual(['POINT (1 2)'])
      expect(axios.get).toHaveBeenCalledTimes(1)
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

      const result = ResponseDetails.prototype.getPagination.call(instance, 6)

      expect(result).toEqual({
        totalResults: 100,
        offset: 0,
        limit: 10,
        currentPage: 6,
        nextPage: 7,
        previousPage: 5,
        totalPages: 10,
        items: [
          { number: 1, href: '/check/results/test/1', current: false },
          { ellipsis: true, href: '#' },
          { number: 5, href: '/check/results/test/5', current: false },
          { number: 6, href: '/check/results/test/6', current: true },
          { number: 7, href: '/check/results/test/7', current: false },
          { ellipsis: true, href: '#' },
          { number: 10, href: '/check/results/test/10', current: false }
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
      const result = ResponseDetails.prototype.getPagination.call(instance, 10)
      expect(result).toEqual({
        totalResults: 100,
        offset: 90,
        limit: 10,
        currentPage: 10,
        nextPage: null,
        previousPage: 9,
        totalPages: 10,
        items: [
          { number: 1, href: '/check/results/test/1', current: false },
          { ellipsis: true, href: '#' },
          { number: 8, href: '/check/results/test/8', current: false },
          { number: 9, href: '/check/results/test/9', current: false },
          { number: 10, href: '/check/results/test/10', current: true }
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
      const result = ResponseDetails.prototype.getPagination.call(instance, 1)
      expect(result).toEqual({
        totalResults: 100,
        offset: 0,
        limit: 10,
        currentPage: 1,
        nextPage: 2,
        previousPage: null,
        totalPages: 10,
        items: [
          { number: 1, href: '/check/results/test/1', current: true },
          { number: 2, href: '/check/results/test/2', current: false },
          { number: 3, href: '/check/results/test/3', current: false },
          { ellipsis: true, href: '#' },
          { number: 10, href: '/check/results/test/10', current: false }
        ]
      })
    })
  })
})
