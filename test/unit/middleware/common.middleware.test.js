import { describe, it, expect, vi } from 'vitest'
import { createPaginationTemplateParams, addDatabaseFieldToSpecification, replaceUnderscoreInSpecification, pullOutDatasetSpecification, extractJsonFieldFromEntities, replaceUnderscoreInEntities, setDefaultParams, getIsPageNumberInRange, getUniqueDatasetFieldsFromSpecification } from '../../../src/middleware/common.middleware'
import logger from '../../../src/utils/logger'

describe('createPaginationTemplateParams', () => {
  it('creates pagination object with correct parameters', () => {
    const req = {
      resultsCount: 100,
      baseSubpath: '/api/results',
      params: { pageNumber: 2 },
      parsedParams: { pageNumber: 2 },
      dataRange: {
        maxPageNumber: 10
      }
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

  it('handles invalid page numbers (negative)', () => {
    const req = {
      resultsCount: 100,
      urlSubPath: '/api/results/',
      dataRange: {
        pageLength: 10
      },
      params: { pageNumber: -1 },
      parsedParams: { pageNumber: -1 }
    }
    const res = {}
    const next = vi.fn()

    expect(() => createPaginationTemplateParams(req, res, next)).toThrowError('Invalid page number')

    expect(next).not.toHaveBeenCalled()
  })

  it('handles invalid page numbers (non-numeric)', () => {
    const req = {
      resultsCount: 100,
      urlSubPath: '/api/results/',
      paginationPageLength: 10,
      params: { pageNumber: 'abc' },
      parsedParams: { pageNumber: 'abc' },
      dataRange: {
        maxPageNumber: 10
      }
    }
    const res = {}
    const next = vi.fn()

    expect(() => createPaginationTemplateParams(req, res, next)).toThrowError('Invalid page number')

    expect(next).not.toHaveBeenCalled()
  })

  it('handles zero total results', () => {
    const req = {
      resultsCount: 0,
      urlSubPath: '/api/results/',
      params: { pageNumber: 1 },
      parsedParams: { pageNumber: 1 },
      dataRange: {
        maxPageNumber: 1
      }
    }
    const res = {}
    const next = vi.fn()

    createPaginationTemplateParams(req, res, next)

    expect(req.pagination).toBeUndefined()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles page number beyond available pages', () => {
    const req = {
      resultsCount: 50,
      baseSubpath: '/api/results',
      params: { pageNumber: 6 },
      parsedParams: { pageNumber: 6 },
      dataRange: {
        minRow: 1,
        maxRow: 1,
        totalRows: 1,
        maxPageNumber: 5
      }
    }
    const res = {}
    const next = vi.fn()

    createPaginationTemplateParams(req, res, next)

    expect(req.pagination).toEqual({
      previous: { href: '/api/results/5' },
      items: [
        { type: 'number', number: 1, href: '/api/results/1', current: false },
        { type: 'number', number: 2, href: '/api/results/2', current: false },
        { type: 'number', number: 3, href: '/api/results/3', current: false },
        { type: 'number', number: 4, href: '/api/results/4', current: false },
        { type: 'number', number: 5, href: '/api/results/5', current: false }
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

  it('handles single GeoX field without GeoY', () => {
    const req = {
      specification: {
        fields: [
          { field: 'GeoX' }
        ]
      },
      fieldMappings: []
    }
    const res = {}
    const next = vi.fn()

    addDatabaseFieldToSpecification(req, res, next)
    expect(req.specification.fields).toHaveLength(1)
    expect(req.specification.fields[0]).toEqual({
      field: 'GeoX',
      datasetField: 'point'
    })
  })

  it('handles single GeoY field without GeoX', () => {
    const req = {
      specification: {
        fields: [
          { field: 'GeoY' }
        ]
      },
      fieldMappings: []
    }
    const res = {}
    const next = vi.fn()

    addDatabaseFieldToSpecification(req, res, next)
    expect(req.specification.fields).toHaveLength(1)
    expect(req.specification.fields[0]).toEqual({
      field: 'GeoY',
      datasetField: 'point'
    })
  })

  it('handles invalid coordinate values', () => {
    const req = {
      specification: {
        fields: [
          { field: 'GeoX', invalid: true },
          { field: 'GeoY', invalid: true }
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
      datasetField: 'point',
      invalid: true
    })
    expect(req.specification.fields[1]).toEqual({
      field: 'GeoY',
      datasetField: 'point',
      invalid: true
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

describe('getUniqueDatasetFieldsFromSpecification', () => {
  it('gets unique dataset fields from specification', () => {
    const req = {
      specification: {
        fields: [
          { field: 'foo', datasetField: 'foo_field' },
          { field: 'bar', datasetField: 'bar_field' },
          { field: 'baz', datasetField: 'foo_field' } // duplicate
        ]
      }
    }
    const res = {}
    const next = vi.fn()

    getUniqueDatasetFieldsFromSpecification(req, res, next)

    expect(req.uniqueDatasetFields).toEqual(['foo_field', 'bar_field'])
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('returns an empty array when specification.fields is empty', () => {
    const req = {
      specification: {
        fields: []
      }
    }
    const res = {}
    const next = vi.fn()

    getUniqueDatasetFieldsFromSpecification(req, res, next)

    expect(req.uniqueDatasetFields).toEqual([])
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('throws an error when specification is not provided', () => {
    const req = {}
    const res = {}
    const next = vi.fn()

    expect(() => getUniqueDatasetFieldsFromSpecification(req, res, next)).toThrowError('specification is required')
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

  it('calls next with an error if JSON in specification is invalid', () => {
    const reqWithInvalidSpecification = {
      ...req,
      specification: {
        json: 'Invalid JSON'
      }
    }
    const next = vi.fn()
    pullOutDatasetSpecification(reqWithInvalidSpecification, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('calls next with an error if dataset specification is missing', () => {
    const reqWithoutSpecification = {
      ...req
    }
    const next = vi.fn()
    pullOutDatasetSpecification(reqWithoutSpecification, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('calls next with an error if dataset specification is an empty array', () => {
    const reqWithEmptySpecification = {
      ...req,
      specification: {
        json: JSON.stringify([])
      }
    }
    const next = vi.fn()
    pullOutDatasetSpecification(reqWithEmptySpecification, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
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

describe('setDefaultParams', () => {
  it('overrides req.params with values from req.parsedParams', () => {
    const req = {
      params: { pageNumber: 1, pageSize: 10 },
      parsedParams: { pageNumber: 2, sortOrder: 'asc' }
    }
    const res = {}
    const next = vi.fn()

    setDefaultParams(req, res, next)

    expect(req.params).toEqual({ pageNumber: 2, pageSize: 10, sortOrder: 'asc' })
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

describe('getIsPageNumberInRange', () => {
  it('correctly retrieves maxPages from request', () => {
    const req = { parsedParams: { pageNumber: 3 }, maxPagesFoo: 5, maxPages: 10 }
    const res = {}
    const next = vi.fn()

    getIsPageNumberInRange('maxPages')(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)

    // Check that the middleware used the correct maxPages value
    req.parsedParams.pageNumber = 11
    getIsPageNumberInRange('maxPages')(req, res, next)
    expect(next.mock.calls[1][0].status).toBe(404)
    expect(next.mock.calls[1][0].message).toBe('Page not found')
  })

  it('allows valid page numbers', () => {
    const req = { parsedParams: { pageNumber: 3 }, maxPages: 5 }
    const res = {}
    const next = vi.fn()

    getIsPageNumberInRange('maxPages')(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('blocks non-integer page numbers', () => {
    const req = { parsedParams: { pageNumber: 'foo' }, maxPages: 5 }
    const res = {}
    const next = vi.fn()

    getIsPageNumberInRange('maxPages')(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].message).toBe('Page number not a number')
  })

  it('blocks page numbers less than 1', () => {
    const req = { parsedParams: { pageNumber: 0 }, maxPages: 5 }
    const res = {}
    const next = vi.fn()

    getIsPageNumberInRange('maxPages')(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].status).toBe(404)
    expect(next.mock.calls[0][0].message).toBe('Page not found')
  })

  it('blocks page numbers exceeding max pages', () => {
    const req = { parsedParams: { pageNumber: 6 }, maxPages: 5 }
    const res = {}
    const next = vi.fn()

    getIsPageNumberInRange('maxPages')(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0].status).toBe(404)
    expect(next.mock.calls[0][0].message).toBe('Page not found')
  })
})
