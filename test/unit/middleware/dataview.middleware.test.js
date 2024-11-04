import { describe, it, expect, vi } from 'vitest'
import {
  setTotalPages,
  setPaginationOptions,
  constructTableParams,
  prepareTemplateParams
} from '../../../src/middleware/dataview.middleware'

describe('dataview.middleware.test.js', () => {
  describe('setTotalPages', () => {
    it('sets total pages', () => {
      const req = {
        entityCount: { count: 100 }
      }
      const res = {}
      const next = vi.fn()

      setTotalPages(req, res, next)
      expect(req.totalPages).toBe(2)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('setPaginationOptions', () => {
    it('sets pagination options', () => {
      const req = {
        entityCount: { count: 100 },
        params: { lpa: 'lpa', dataset: 'dataset' }
      }
      const res = {}
      const next = vi.fn()

      const pageLength = 100

      setPaginationOptions(pageLength)(req, res, next)
      expect(req.resultsCount).toEqual(100)
      expect(req.urlSubPath).toEqual(`/organisations/${encodeURIComponent(req.params.lpa)}/${encodeURIComponent(req.params.dataset)}/data/`)
      expect(req.paginationPageLength).toEqual(pageLength)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('constructTableParams', () => {
    it('constructs table parameters with correct columns, fields, and rows', () => {
      const req = {
        entities: [{ id: 1, foo_field: 'bar', baz_field: 'qux' }, { id: 2, foo_field: 'baz', baz_field: 'quux' }],
        specification: { fields: [{ field: 'foo', datasetField: 'foo_field' }, { field: 'baz', datasetField: 'baz_field' }] }
      }
      const res = {}
      const next = vi.fn()

      constructTableParams(req, res, next)

      expect(req.tableParams).toEqual({
        columns: ['foo', 'baz'],
        fields: ['foo_field', 'baz_field'],
        rows: [
          {
            columns: {
              foo_field: { value: 'bar' },
              baz_field: { value: 'qux' }
            }
          },
          {
            columns: {
              foo_field: { value: 'baz' },
              baz_field: { value: 'quux' }
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
        orgInfo: { name: 'Mock Org' },
        dataset: { name: 'Mock Dataset' },
        tableParams: { columns: ['foo'], fields: ['foo'] },
        issues: [],
        pagination: {}
      }
      const res = {}
      const next = vi.fn()

      prepareTemplateParams(req, res, next)

      expect(req.templateParams).toEqual({
        organisation: { name: 'Mock Org' },
        dataset: { name: 'Mock Dataset' },
        taskCount: 0,
        tableParams: { columns: ['foo'], fields: ['foo'] },
        pagination: {}
      })
      expect(next).toHaveBeenCalledTimes(1)
    })
  })
})
