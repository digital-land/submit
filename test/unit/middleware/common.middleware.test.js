import { describe, it, expect, vi } from 'vitest'
import { createPaginationTemplateParams, addDatabaseFieldToSpecification, replaceUnderscoreInSpecification, pullOutDatasetSpecification } from '../../../src/middleware/common.middleware'

describe('common.middleware.test.js', () => {
  describe('createPaginationTemplateParams', () => {
    it('creates pagination object with correct parameters', () => {
      const req = {
        resultsCount: 100,
        urlSubPath: '/api/results/',
        paginationPageLength: 10,
        params: { pageNumber: 2 }
      }
      const res = {}
      const next = vi.fn()

      createPaginationTemplateParams(req, res, next)

      expect(req.pagination).toEqual({
        previous: { href: '/api/results/1' },
        next: { href: '/api/results/3' },
        items: [
          { type: 'number', number: 1, href: '/api/results/1', current: false },
          { type: 'number', number: 2, href: '/api/results/2', current: true },
          { type: 'number', number: 3, href: '/api/results/3', current: false },
          { type: 'ellipsis', ellipsis: true, href: '#' },
          { type: 'number', number: 10, href: '/api/results/10', current: false }
        ]
      })
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('handles edge cases for pagination', () => {
      const req = {
        resultsCount: 10,
        urlSubPath: '/api/results/',
        paginationPageLength: 10,
        params: { pageNumber: 1 }
      }
      const res = {}
      const next = vi.fn()

      createPaginationTemplateParams(req, res, next)

      expect(req.pagination).toEqual({
        items: [
          { type: 'number', number: 1, href: '/api/results/1', current: true }
        ]
      })
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('replaceUnderscoreInSpecification', () => {
    it('replaces underscore with hyphen in specification datasetFields', () => {
      const req = {
        specification: {
          fields: [
            { datasetField: 'dataset_field' },
            { datasetField: 'data_set_field' }
          ]
        }
      }
      const res = {}
      const next = vi.fn()

      replaceUnderscoreInSpecification(req, res, next)

      expect(req.specification.fields).toHaveLength(2)
      expect(req.specification.fields).toEqual([
        { datasetField: 'dataset-field' },
        { datasetField: 'data-set-field' }
      ])
    })

    it('calls next function', () => {
      const req = {
        specification: {
          fields: [
            { datasetField: 'dataset_field' },
            { datasetField: 'data_set_field' }
          ]
        }
      }
      const res = {}
      const next = vi.fn()

      replaceUnderscoreInSpecification(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('handles entities with no underscore in keys', () => {
      const req = {
        specification: {
          fields: [
            { datasetField: 'datasetField' }
          ]
        }
      }
      const res = {}
      const next = vi.fn()

      replaceUnderscoreInSpecification(req, res, next)
      expect(req.specification.fields).toHaveLength(1)
      expect(req.specification.fields[0]).toEqual({ datasetField: 'datasetField' })
    })
  })

  describe('addDatabaseFieldToSpecification', () => {
    it('adds database field to specification fields', () => {
      const req = {
        specification: {
          fields: [
            { field: 'name' },
            { field: 'address' }
          ]
        },
        fieldMappings: [
          { field: 'name', replacement_field: 'full_name' },
          { field: 'address', replacement_field: 'physical_address' }
        ]
      }
      const res = {}
      const next = vi.fn()

      addDatabaseFieldToSpecification(req, res, next)
      expect(req.specification.fields).toHaveLength(2)
      expect(req.specification.fields[0]).toEqual({
        field: 'name',
        datasetField: 'full_name'
      })
      expect(req.specification.fields[1]).toEqual({
        field: 'address',
        datasetField: 'physical_address'
      })
    })

    it('handles special case for GeoX and GeoY fields', () => {
      const req = {
        specification: {
          fields: [
            { field: 'GeoX' },
            { field: 'GeoY' }
          ]
        },
        fieldMappings: []
      }
      const res = {}
      const next = vi.fn()

      addDatabaseFieldToSpecification(req, res, next)
      expect(req.specification.fields).toHaveLength(2)
      expect(req.specification.fields[0]).toEqual({
        field: 'GeoX',
        datasetField: 'point'
      })
      expect(req.specification.fields[1]).toEqual({
        field: 'GeoY',
        datasetField: 'point'
      })
    })

    it('handles fields with no matching field mapping', () => {
      const req = {
        specification: {
          fields: [
            { field: 'unknownField' }
          ]
        },
        fieldMappings: []
      }
      const res = {}
      const next = vi.fn()

      addDatabaseFieldToSpecification(req, res, next)
      expect(req.specification.fields).toHaveLength(1)
      expect(req.specification.fields[0]).toEqual({
        field: 'unknownField',
        datasetField: 'unknownField'
      })
    })

    it('calls next function', () => {
      const req = {
        specification: {
          fields: [
            { field: 'name' }
          ]
        },
        fieldMappings: [
          { field: 'name', replacement_field: 'full_name' }
        ]
      }
      const res = {}
      const next = vi.fn()

      addDatabaseFieldToSpecification(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })
})

describe('pullOutDatasetSpecification', () => {
  const req = {
    params: {
      lpa: 'mock-lpa',
      dataset: 'mock-dataset'
    },
    dataset: {
      name: 'mock dataset',
      dataset: 'mock-dataset',
      collection: 'mock-collection'
    }
  }
  const res = {}

  it('leaves specification unchanged, and extracts the dataset specification', () => {
    const reqWithSpecification = {
      ...req,
      specification: {
        json: JSON.stringify([
          { dataset: 'mock-dataset', foo: 'bar' }
        ])
      }
    }
    pullOutDatasetSpecification(reqWithSpecification, res, () => {})
    expect(reqWithSpecification.specification).toEqual(reqWithSpecification.specification)
    expect(reqWithSpecification.datasetSpecification).toEqual({ dataset: 'mock-dataset', foo: 'bar' })
  })
})

describe.todo('getIsPageNumberInRange')
