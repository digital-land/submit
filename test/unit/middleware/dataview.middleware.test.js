import { describe, it, expect, vi } from 'vitest'
import {
  constructTableParams,
  getDataRange,
  prepareTemplateParams
} from '../../../src/middleware/dataview.middleware'

describe('dataview.middleware.test.js', () => {
  describe('constructTableParams', () => {
    it('constructs table parameters with correct columns, fields, and rows', () => {
      const req = {
        entities: [{ id: 1, foo_field: 'bar', baz_field: 'qux' }, { id: 2, foo_field: 'baz', baz_field: 'quux' }],
        uniqueDatasetFields: ['foo_field', 'baz_field']
      }
      const res = {}
      const next = vi.fn()

      constructTableParams(req, res, next)

      expect(req.tableParams).toEqual({
        columns: ['foo_field', 'baz_field'],
        fields: ['foo_field', 'baz_field'],
        rows: [
          {
            columns: {
              foo_field: { value: 'bar', classes: '', html: undefined },
              baz_field: { value: 'qux', classes: '', html: undefined }
            }
          },
          {
            columns: {
              foo_field: { value: 'baz', classes: '', html: undefined },
              baz_field: { value: 'quux', classes: '', html: undefined }
            }
          }
        ]
      })
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('constructs table parameters with correct classes for numeric and date values', () => {
      const req = {
        entities: [
          { id: 1, num_field: 0.06, date_field: '2022-01-01' },
          { id: 2, num_field: '10', date_field: '2022-01-02' }
        ],
        uniqueDatasetFields: ['num_field', 'date_field']
      }
      const res = {}
      const next = vi.fn()

      constructTableParams(req, res, next)

      expect(req.tableParams).toEqual({
        columns: ['num_field', 'date_field'],
        fields: ['num_field', 'date_field'],
        rows: [
          {
            columns: {
              num_field: { value: 0.06, classes: 'govuk-table__cell--numeric', html: undefined },
              date_field: { value: '2022-01-01', classes: 'govuk-table__cell--numeric', html: undefined }
            }
          },
          {
            columns: {
              num_field: { value: '10', classes: 'govuk-table__cell--numeric', html: undefined },
              date_field: { value: '2022-01-02', classes: 'govuk-table__cell--numeric', html: undefined }
            }
          }
        ]
      })
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('constructs table parameters with correct html field as a link for url values', () => {
      const req = {
        entities: [
          { id: 1, url_field: 'https://example.com' },
          { id: 2, url_field: 'https://example.org' }
        ],
        uniqueDatasetFields: ['url_field']
      }
      const res = {}
      const next = vi.fn()

      constructTableParams(req, res, next)

      expect(req.tableParams).toEqual({
        columns: ['url_field'],
        fields: ['url_field'],
        rows: [
          {
            columns: {
              url_field: {
                html: "<a href='https://example.com' target='_blank' rel='noopener noreferrer' aria-label='https://example.com (opens in new tab)'>https://example.com</a>",
                classes: '',
                value: undefined
              }
            }
          },
          {
            columns: {
              url_field: {
                html: "<a href='https://example.org' target='_blank' rel='noopener noreferrer' aria-label='https://example.org (opens in new tab)'>https://example.org</a>",
                classes: '',
                value: undefined
              }
            }
          }
        ]
      })
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('getDataRange', () => {
    it('should set up correct dataRange properties when pageNumber is 1', () => {
      const req = {
        entityCount: { count: 10 },
        parsedParams: { pageNumber: 1 }
      }
      const res = {}
      const next = vi.fn()

      getDataRange(req, res, next)

      expect(req.dataRange).toEqual({
        minRow: 0,
        maxRow: 10,
        totalRows: 10,
        pageLength: 50,
        offset: 0,
        maxPageNumber: Math.ceil(10 / 50)
      })
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('should set up correct dataRange properties when pageNumber is greater than 1', () => {
      const req = {
        entityCount: { count: 80 },
        parsedParams: { pageNumber: 2 }
      }
      const res = {}
      const next = vi.fn()

      getDataRange(req, res, next)

      expect(req.dataRange).toEqual({
        minRow: 50,
        maxRow: 80,
        totalRows: 80,
        pageLength: 50,
        offset: 50,
        maxPageNumber: Math.ceil(80 / 50)
      })
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('prepareTemplateParams', () => {
    it('prepares template parameters with correct properties', () => {
      const req = {
        orgInfo: { name: 'Mock Org' },
        dataset: { name: 'Mock Dataset' },
        tableParams: { columns: ['foo'], fields: ['foo'] },
        issues: [],
        pagination: {},
        entityCount: { count: 1 },
        offset: 0,
        dataRange: {
          minRow: 1,
          maxRow: 1,
          totalRows: 1
        }
      }
      const res = {}
      const next = vi.fn()

      prepareTemplateParams(req, res, next)

      expect(req.templateParams).toEqual({
        organisation: { name: 'Mock Org' },
        dataset: { name: 'Mock Dataset' },
        taskCount: 0,
        tableParams: { columns: ['foo'], fields: ['foo'] },
        pagination: {},
        dataRange: {
          minRow: 1,
          maxRow: 1,
          totalRows: 1
        }
      })
      expect(next).toHaveBeenCalledTimes(1)
    })
  })
})
