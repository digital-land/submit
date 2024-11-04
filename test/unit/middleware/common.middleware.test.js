import { describe, it, expect, vi } from 'vitest'
import { createPaginationTemplateParams, addDatabaseFieldToSpecification, replaceUnderscoreInSpecification, pullOutDatasetSpecification, extractJsonFieldFromEntities, replaceUnderscoreInEntities, setDefaultParams } from '../../../src/middleware/common.middleware'
import logger from '../../../src/utils/logger'

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

  it('extracts the dataset specification and updates the req object', () => {
    const reqWithSpecification = {
      ...req,
      specification: {
        json: JSON.stringify([
          { dataset: 'mock-dataset', foo: 'bar' }
        ])
      }
    }
    pullOutDatasetSpecification(reqWithSpecification, res, () => {})
    expect(reqWithSpecification.specification).toEqual({ dataset: 'mock-dataset', foo: 'bar' })
  })
})

describe('extractJsonFieldFromEntities', () => {
  it('removes json field from entities and adds its contents to the entity', () => {
    const req = {
      entities: [
        { id: 1, json: '{"foo": "bar"}' },
        { id: 2, json: '{"baz": "qux"}' }
      ]
    }
    const res = {}
    const next = vi.fn()

    extractJsonFieldFromEntities(req, res, next)

    expect(req.entities).toHaveLength(2)
    expect(req.entities[0]).toEqual({ id: 1, foo: 'bar' })
    expect(req.entities[1]).toEqual({ id: 2, baz: 'qux' })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles entities with no json field', () => {
    const req = {
      entities: [
        { id: 1, foo: 'bar' },
        { id: 2, baz: 'qux' }
      ]
    }
    const res = {}
    const next = vi.fn()

    extractJsonFieldFromEntities(req, res, next)

    expect(req.entities).toHaveLength(2)
    expect(req.entities[0]).toEqual({ id: 1, foo: 'bar' })
    expect(req.entities[1]).toEqual({ id: 2, baz: 'qux' })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles entities with empty json field', () => {
    const req = {
      entities: [
        { id: 1, json: '' },
        { id: 2, json: '{}' }
      ]
    }
    const res = {}
    const next = vi.fn()

    extractJsonFieldFromEntities(req, res, next)

    expect(req.entities).toHaveLength(2)
    expect(req.entities[0]).toEqual({ id: 1, json: '' })
    expect(req.entities[1]).toEqual({ id: 2 })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles JSON parsing errors by setting the json field to undefined', () => {
    const req = {
      entities: [
        { id: 1, json: '{"foo": "bar"' } // invalid JSON
      ]
    }
    const res = {}
    const next = vi.fn()
    const loggerWarnSpy = vi.spyOn(logger, 'warn')

    extractJsonFieldFromEntities(req, res, next)

    expect(loggerWarnSpy).toHaveBeenCalledTimes(1)
    expect(req.entities).toHaveLength(1)
    expect(req.entities[0]).toEqual({ id: 1, json: undefined })
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('replaceUnderscoreInEntities', () => {
  it('replaces underscores with hyphens in entity keys', () => {
    const req = {
      entities: [
        { foo_bar: 'baz', hello_world: 'qux' },
        { foo_baz: 'qux', hello_universe: 'xyz' }
      ]
    }
    const res = {}
    const next = vi.fn()

    replaceUnderscoreInEntities(req, res, next)

    expect(req.entities).toHaveLength(2)
    expect(req.entities[0]).toEqual({ 'foo-bar': 'baz', 'hello-world': 'qux' })
    expect(req.entities[1]).toEqual({ 'foo-baz': 'qux', 'hello-universe': 'xyz' })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles entities with no underscore-containing keys', () => {
    const req = {
      entities: [
        { foo: 'bar', baz: 'qux' },
        { xyz: 'abc', def: 'ghi' }
      ]
    }
    const res = {}
    const next = vi.fn()

    replaceUnderscoreInEntities(req, res, next)

    expect(req.entities).toHaveLength(2)
    expect(req.entities[0]).toEqual({ foo: 'bar', baz: 'qux' })
    expect(req.entities[1]).toEqual({ xyz: 'abc', def: 'ghi' })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles empty entities array', () => {
    const req = {
      entities: []
    }
    const res = {}
    const next = vi.fn()

    replaceUnderscoreInEntities(req, res, next)

    expect(req.entities).toHaveLength(0)
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('replaceUnderscoreInEntities', () => {
  it('replaces underscores with hyphens in entity keys', () => {
    const req = {
      entities: [
        { foo_bar: 'baz', hello_world: 'qux' },
        { foo_baz: 'qux', hello_universe: 'xyz' }
      ]
    }
    const res = {}
    const next = vi.fn()

    replaceUnderscoreInEntities(req, res, next)

    expect(req.entities).toHaveLength(2)
    expect(req.entities[0]).toEqual({ 'foo-bar': 'baz', 'hello-world': 'qux' })
    expect(req.entities[1]).toEqual({ 'foo-baz': 'qux', 'hello-universe': 'xyz' })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles entities with no underscore-containing keys', () => {
    const req = {
      entities: [
        { foo: 'bar', baz: 'qux' },
        { xyz: 'abc', def: 'ghi' }
      ]
    }
    const res = {}
    const next = vi.fn()

    replaceUnderscoreInEntities(req, res, next)

    expect(req.entities).toHaveLength(2)
    expect(req.entities[0]).toEqual({ foo: 'bar', baz: 'qux' })
    expect(req.entities[1]).toEqual({ xyz: 'abc', def: 'ghi' })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles null or undefined entities', () => {
    const req = {
      entities: null
    }
    const res = {}
    const next = vi.fn()

    replaceUnderscoreInEntities(req, res, next)

    expect(req.entities).toBeNull()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles empty entities array', () => {
    const req = {
      entities: []
    }
    const res = {}
    const next = vi.fn()

    replaceUnderscoreInEntities(req, res, next)

    expect(req.entities).toHaveLength(0)
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('setDefaultParams', () => {
  it('overrides req.params with values from req.parsedParams', () => {
    const req = {
      params: { pageNumber: 1, pageSize: 10 },
      parsedParams: { pageNumber: 2, sortOrder: 'asc' }
    }
    const res = {}
    const next = vi.fn()

    setDefaultParams(req, res, next)

    expect(req.params).toEqual({ pageNumber: 2, pageSize: 10 })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('does not modify req.params if req.parsedParams is empty', () => {
    const req = {
      params: { pageNumber: 1, pageSize: 10 },
      parsedParams: {}
    }
    const res = {}
    const next = vi.fn()

    setDefaultParams(req, res, next)

    expect(req.params).toEqual({ pageNumber: 1, pageSize: 10 })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles null or undefined req.parsedParams', () => {
    const req = {
      params: { pageNumber: 1 },
      parsedParams: null
    }
    const res = {}
    const next = vi.fn()

    setDefaultParams(req, res, next)

    expect(req.params).toEqual({ pageNumber: 1 })
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe.todo('getIsPageNumberInRange')
