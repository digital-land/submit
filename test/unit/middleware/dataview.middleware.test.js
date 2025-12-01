import { describe, it, expect, vi } from 'vitest'
import {
  constructTableParams,
  prepareTemplateParams,
  setRecordCount
} from '../../../src/middleware/dataview.middleware'

describe('dataview.middleware.test.js', () => {
  describe('set record count', () => {
    it('sets req.recordCount to the length of req.issues', () => {
      const req = { entityCount: { count: 3 } }
      const res = {}
      const next = vi.fn()

      setRecordCount(req, res, next)

      expect(req.recordCount).toBe(3)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('sets the record count to 0 if req.entityCount is undefined', () => {
      const req = {}
      const res = {}
      const next = vi.fn()

      setRecordCount(req, res, next)

      expect(req.recordCount).toBe(0)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('sets the record count to 0 if req.entityCount is null', () => {
      const req = { entityCount: null }
      const res = {}
      const next = vi.fn()

      setRecordCount(req, res, next)

      expect(req.recordCount).toBe(0)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

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
              num_field: { value: 0.06, classes: '', html: undefined },
              date_field: { value: '2022-01-01', classes: '', html: undefined }
            }
          },
          {
            columns: {
              num_field: { value: '10', classes: '', html: undefined },
              date_field: { value: '2022-01-02', classes: '', html: undefined }
            }
          }
        ]
      })
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('constructs table parameters with "name" and "refernce" as leading columns', () => {
      const req = {
        entities: [{ id: 2, foo_field: 'foo2', baz_field: 'quux', name: 'baz' }, { id: 1, name: 'bar', foo_field: 'foo1', baz_field: 'qux' }],
        uniqueDatasetFields: ['name', 'baz_field']
      }
      const res = {}
      const next = vi.fn()

      constructTableParams(req, res, next)

      expect(req.tableParams.columns[0]).toBe('name')
      expect(req.tableParams.fields[0]).toBe('name')
    })

    it('constructs table parameters "refernce" as first column', () => {
      const req = {
        entities: [{ id: 2, name: 'item 2', reference: '002' }, { id: 1, name: 'bar', reference: '001' }],
        uniqueDatasetFields: ['id', 'name', 'reference']
      }
      const res = {}
      const next = vi.fn()

      constructTableParams(req, res, next)

      expect(req.tableParams.columns[0]).toBe('reference')
      expect(req.tableParams.fields[0]).toBe('reference')
      expect(req.tableParams.columns[1]).toBe('name')
      expect(req.tableParams.fields[1]).toBe('name')
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

  describe('prepareTemplateParams', () => {
    it('prepares template parameters with correct properties', () => {
      const req = {
        orgInfo: { name: 'Mock Org', entity: 'mock-entity' },
        dataset: { name: 'Mock Dataset', dataset: 'mock-dataset' },
        tableParams: { columns: ['foo'], fields: ['foo'] },
        entityIssueCounts: [],
        entryIssueCounts: [],
        pagination: {},
        entityCount: { count: 1 },
        offset: 0,
        dataRange: {
          minRow: 1,
          maxRow: 1,
          totalRows: 1
        },
        authority: 'mock-authority'
      }
      const res = {}
      const next = vi.fn()

      prepareTemplateParams(req, res, next)

      expect(req.templateParams).toEqual({
        downloadUrl: 'https://download.planning.data.gov.uk/mock-dataset.csv?orgEntity=mock-entity&quality=mock-authority',
        organisation: { name: 'Mock Org', entity: 'mock-entity' },
        dataset: { name: 'Mock Dataset', dataset: 'mock-dataset' },
        authority: 'mock-authority',
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
