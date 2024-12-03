import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPaginationTemplateParams, addDatabaseFieldToSpecification, replaceUnderscoreInSpecification, pullOutDatasetSpecification, extractJsonFieldFromEntities, replaceUnderscoreInEntities, setDefaultParams, getUniqueDatasetFieldsFromSpecification, show404IfPageNumberNotInRange, FilterOutIssuesToMostRecent, removeIssuesThatHaveBeenFixed, addFieldMappingsToIssue, getSetDataRange, getErrorSummaryItems, getSetBaseSubPath, prepareIssueDetailsTemplateParams } from '../../../src/middleware/common.middleware'
import logger from '../../../src/utils/logger'
import datasette from '../../../src/services/datasette.js'
import performanceDbApi from '../../../src/services/performanceDbApi.js'

vi.mock('../../../src/services/performanceDbApi.js')

vi.mock('../../../src/services/datasette.js', () => ({
  default: {
    runQuery: vi.fn()
  }
}))

describe('show404IfPageNumberNotInRange middleware', () => {
  const dataRange = {
    maxPageNumber: 3
  }

  it('should not throw an error when the page number is within the range', () => {
    const req = {
      parsedParams: { pageNumber: 1 },
      dataRange
    }
    const res = {}
    const next = vi.fn()
    show404IfPageNumberNotInRange(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('should throw a 404 error when the page number is greater than the max page number', () => {
    const req = {
      parsedParams: { pageNumber: dataRange.maxPageNumber + 1 },
      dataRange
    }
    const res = {}
    const next = vi.fn((err) => {
      expect(err instanceof Error).toBe(true)
      expect(err.status).toBe(404)
      expect(err.message).toBe('page number not in range')
    })
    show404IfPageNumberNotInRange(req, res, next)
  })

  it('should throw a 404 error when the page number is less than 1', () => {
    const req = {
      parsedParams: { pageNumber: 0 },
      dataRange
    }
    const res = {}
    const next = vi.fn((err) => {
      expect(err instanceof Error).toBe(true)
      expect(err.status).toBe(404)
      expect(err.message).toBe('page number not in range')
    })
    show404IfPageNumberNotInRange(req, res, next)
  })

  it('should throw an error when dataRange is undefined', () => {
    const req = {
      parsedParams: { pageNumber: 1 },
      dataRange: undefined
    }
    const res = {}
    const next = vi.fn()
    show404IfPageNumberNotInRange(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(new Error('invalid req.dataRange object'))
  })

  it('should throw an error when dataRange.maxPageNumber is non numeric', () => {
    const req = {
      parsedParams: { pageNumber: 1 },
      dataRange: {
        maxPageNumber: 'abc'
      }
    }
    const res = {}
    const next = vi.fn()
    show404IfPageNumberNotInRange(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(new Error('invalid req.dataRange object'))
  })

  it('should throw an error when dataRange.maxPageNumber is undefined', () => {
    const req = {
      parsedParams: { pageNumber: 1 },
      dataRange: {
        maxPageNumber: undefined
      }
    }
    const res = {}
    const next = vi.fn()
    show404IfPageNumberNotInRange(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(new Error('invalid req.dataRange object'))
  })
})

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
    createPaginationTemplateParams(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith(new Error('Invalid page number'))
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

    createPaginationTemplateParams(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith(new Error('Invalid page number'))
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

describe('FilterOutIssuesToMostRecent', () => {
  it('removes issues of the same type and field and entity to only get the most recent', () => {
    const req = {
      resources: [
        { resource: 'resource1', start_date: '2022-01-01' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource3', start_date: '2022-01-03' }
      ],
      issues: [
        { entity: 'entity1', field: 'field1', resource: 'resource1' },
        { entity: 'entity1', field: 'field1', resource: 'resource2' },
        { entity: 'entity1', field: 'field2', resource: 'resource1' },
        { entity: 'entity1', field: 'field2', resource: 'resource2' },
        { entity: 'entity1', field: 'field2', resource: 'resource3' },
        { entity: 'entity2', field: 'field2', resource: 'resource1' },
        { entity: 'entity2', field: 'field2', resource: 'resource2' },
        { entity: 'entity2', field: 'field2', resource: 'resource3' }
      ]
    }
    const res = {}
    const next = vi.fn()

    FilterOutIssuesToMostRecent(req, res, next)

    expect(req.issues).toEqual([
      { entity: 'entity1', field: 'field1', resource: 'resource2', start_date: new Date('2022-01-02') },
      { entity: 'entity1', field: 'field2', resource: 'resource3', start_date: new Date('2022-01-03') },
      { entity: 'entity2', field: 'field2', resource: 'resource3', start_date: new Date('2022-01-03') }
    ])
  })

  it('leaves issues with different resources', () => {
    const req = {
      resources: [
        { resource: 'resource1', start_date: '2022-01-01' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource3', start_date: '2022-01-03' }
      ],
      issues: [
        { entity: 'entity1', field: 'field1', resource: 'resource1' },
        { entity: 'entity2', field: 'field2', resource: 'resource2' },
        { entity: 'entity3', field: 'field3', resource: 'resource3' }
      ]
    }
    const res = {}
    const next = vi.fn()

    FilterOutIssuesToMostRecent(req, res, next)

    expect(req.issues).toEqual([
      { entity: 'entity1', field: 'field1', resource: 'resource1', start_date: new Date('2022-01-01') },
      { entity: 'entity2', field: 'field2', resource: 'resource2', start_date: new Date('2022-01-02') },
      { entity: 'entity3', field: 'field3', resource: 'resource3', start_date: new Date('2022-01-03') }
    ])
  })

  it('handles issues with no corresponding resource', () => {
    const req = {
      issues: [
        { entity: 'entity1', field: 'field1', start_date: '2022-01-01', resource: 'resource1' },
        { entity: 'entity2', field: 'field2', start_date: '2022-01-01', resource: 'invalid-resource' },
        { entity: 'entity3', field: 'field3', start_date: '2022-01-02', resource: 'resource3' }
      ],
      resources: [
        { resource: 'resource1', start_date: '2022-01-01' },
        { resource: 'resource3', start_date: '2022-01-02' }
      ]
    }
    const res = {}
    const next = vi.fn()

    FilterOutIssuesToMostRecent(req, res, next)

    expect(req.issues).toEqual([
      { entity: 'entity1', field: 'field1', start_date: new Date('2022-01-01'), resource: 'resource1' },
      { entity: 'entity3', field: 'field3', start_date: new Date('2022-01-02'), resource: 'resource3' }
    ])
  })

  it('handles correctly with invalid date strings in start_date', () => {
    const req = {
      resources: [
        { resource: 'resource1', start_date: '2022-01-01' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource3', start_date: '2022-01-03' }
      ],
      issues: [
        { entity: 'entity1', field: 'field1', resource: 'resource1', start_date: 'not-a-date' },
        { entity: 'entity1', field: 'field1', resource: 'resource2', start_date: '2022-01-02' },
        { entity: 'entity1', field: 'field2', resource: 'resource3', start_date: '2022-01-03' },
        { entity: 'entity2', field: 'field2', resource: 'resource1', start_date: '2022-01-01' },
        { entity: 'entity2', field: 'field2', resource: 'resource2', start_date: '2022-01-02' },
        { entity: 'entity2', field: 'field2', resource: 'resource3', start_date: '2022-01-03' }
      ]
    }
    const res = {}
    const next = vi.fn()

    FilterOutIssuesToMostRecent(req, res, next)

    expect(req.issues).toEqual([
      { entity: 'entity1', field: 'field1', resource: 'resource2', start_date: new Date('2022-01-02') },
      { entity: 'entity1', field: 'field2', resource: 'resource3', start_date: new Date('2022-01-03') },
      { entity: 'entity2', field: 'field2', resource: 'resource3', start_date: new Date('2022-01-03') }
    ])
  })

  it('handles correctly with missing start_date field', () => {
    const req = {
      resources: [
        { resource: 'resource1', start_date: '2022-01-01' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource3', start_date: '2022-01-03' }
      ],
      issues: [
        { entity: 'entity1', field: 'field1', resource: 'resource1', start_date: undefined },
        { entity: 'entity1', field: 'field1', resource: 'resource2', start_date: '2022-01-02' },
        { entity: 'entity1', field: 'field2', resource: 'resource3', start_date: '2022-01-03' },
        { entity: 'entity2', field: 'field2', resource: 'resource1', start_date: '2022-01-01' },
        { entity: 'entity2', field: 'field2', resource: 'resource2', start_date: '2022-01-02' },
        { entity: 'entity2', field: 'field2', resource: 'resource3', start_date: '2022-01-03' }
      ]
    }
    const res = {}
    const next = vi.fn()

    FilterOutIssuesToMostRecent(req, res, next)

    expect(req.issues).toEqual([
      { entity: 'entity1', field: 'field1', resource: 'resource2', start_date: new Date('2022-01-02') },
      { entity: 'entity1', field: 'field2', resource: 'resource3', start_date: new Date('2022-01-03') },
      { entity: 'entity2', field: 'field2', resource: 'resource3', start_date: new Date('2022-01-03') }
    ])
  })

  it('handles correctly with malformed date objects', () => {
    const req = {
      resources: [
        { resource: 'resource1', start_date: '2022-01-01' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource3', start_date: '2022-01-03' }
      ],
      issues: [
        { entity: 'entity1', field: 'field1', resource: 'resource1', start_date: new Date(' invalid-date') },
        { entity: 'entity1', field: 'field1', resource: 'resource2', start_date: '2022-01-02' },
        { entity: 'entity1', field: 'field2', resource: 'resource3', start_date: '2022-01-03' },
        { entity: 'entity2', field: 'field2', resource: 'resource1', start_date: '2022-01-01' },
        { entity: 'entity2', field: 'field2', resource: 'resource2', start_date: '2022-01-02' },
        { entity: 'entity2', field: 'field2', resource: 'resource3', start_date: '2022-01-03' }
      ]
    }
    const res = {}
    const next = vi.fn()

    FilterOutIssuesToMostRecent(req, res, next)

    expect(req.issues).toEqual([
      { entity: 'entity1', field: 'field1', resource: 'resource2', start_date: new Date('2022-01-02') },
      { entity: 'entity1', field: 'field2', resource: 'resource3', start_date: new Date('2022-01-03') },
      { entity: 'entity2', field: 'field2', resource: 'resource3', start_date: new Date('2022-01-03') }
    ])
  })
})

describe('removeIssuesThatHaveBeenFixed', () => {
  const mockDatasetteQuery = (moreRecentEntityFieldsFacts) => {
    datasette.runQuery.mockImplementation((query, dataset) => {
      let formattedData = []
      moreRecentEntityFieldsFacts.forEach(([entity, field, resource]) => {
        if (query.includes(entity) && query.includes(field) && query.includes(resource)) {
          formattedData = [{ entity, field, resource }]
        }
      })
      return {
        formattedData
      }
    })
  }

  it('removes issues with more a recent fact', async () => {
    const req = {
      issues: [
        { entity: 'entity1', field: 'field1', resource: 'resource1' },
        { entity: 'entity2', field: 'field1', resource: 'resource2' },
        { entity: 'entity3', field: 'field1', resource: 'resource3' }
      ],
      resources: [
        { resource: 'resource3', start_date: '2022-01-03' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource1', start_date: '2022-01-01' }
      ]
    }
    const res = {}

    const moreRecentEntityFieldsFacts = [
      ['entity2', 'field1', 'resource3'],
      ['entity1', 'field1', 'resource3']
    ]
    mockDatasetteQuery(moreRecentEntityFieldsFacts)

    await removeIssuesThatHaveBeenFixed(req, res, () => {
      expect(req.issues).toEqual([
        { entity: 'entity3', field: 'field1', resource: 'resource3' }
      ])
    })
  })

  it('leaves issues that are the most recent resource', async () => {
    const req = {
      issues: [
        { entity: 'entity3', field: 'field1', resource: 'resource3' }
      ],
      resources: [
        { resource: 'resource3', start_date: '2022-01-03' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource1', start_date: '2022-01-01' }
      ]
    }
    const res = {}

    datasette.runQuery.mockImplementation((query, dataset) => {
      if (query.includes('resource3') && query.includes('entity3')) {
        return {
          formattedData: [
            { entity: 'entity3', field: 'field1' }
          ]
        }
      } else {
        return {
          formattedData: []
        }
      }
    })
    const moreRecentEntityFieldsFacts = [
      ['entity3', 'field1', 'resource3']
    ]
    mockDatasetteQuery(moreRecentEntityFieldsFacts)

    await removeIssuesThatHaveBeenFixed(req, res, () => {
      expect(req.issues).toEqual([
        { entity: 'entity3', field: 'field1', resource: 'resource3' }
      ])
    })
  })

  it('leaves issues that do not have a more recent fact', async () => {
    const req = {
      issues: [
        { entity: 'entity3', field: 'field1', resource: 'resource2' }
      ],
      resources: [
        { resource: 'resource3', start_date: '2022-01-03' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource1', start_date: '2022-01-01' }
      ]
    }
    const res = {}

    const moreRecentEntityFieldsFacts = []
    mockDatasetteQuery(moreRecentEntityFieldsFacts)

    await removeIssuesThatHaveBeenFixed(req, res, () => {
      expect(req.issues).toEqual([
        { entity: 'entity3', field: 'field1', resource: 'resource2' }
      ])
    })
  })

  it('removes multiple issues for the same resource', async () => {
    const req = {
      issues: [
        { entity: 'entity1', field: 'field1', resource: 'resource1' },
        { entity: 'entity2', field: 'field1', resource: 'resource1' }
      ],
      resources: [
        { resource: 'resource3', start_date: '2022-01-03' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource1', start_date: '2022-01-01' }
      ]
    }
    const res = {}

    const moreRecentEntityFieldsFacts = [
      ['entity1', 'field1', 'resource2'],
      ['entity2', 'field1', 'resource2']
    ]
    mockDatasetteQuery(moreRecentEntityFieldsFacts)

    await removeIssuesThatHaveBeenFixed(req, res, () => {
      expect(req.issues).toEqual([])
    })
  })

  it('leaves no issues when none have been fixed', async () => {
    const req = {
      issues: [],
      resources: [
        { resource: 'resource1', start_date: '2022-01-01' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource3', start_date: '2022-01-03' }
      ]
    }
    const res = {}

    const moreRecentEntityFieldsFacts = []
    mockDatasetteQuery(moreRecentEntityFieldsFacts)

    await removeIssuesThatHaveBeenFixed(req, res, () => {
      expect(req.issues).toEqual([])
    })
  })

  it('leaves issues when no resources', async () => {
    const req = {
      issues: [
        { entity: 'entity1', field: 'field1', resource: 'resource1' }
      ],
      resources: []
    }
    const res = {}

    const moreRecentEntityFieldsFacts = [
      ['entity1', 'field1', 'resource1']
    ]
    mockDatasetteQuery(moreRecentEntityFieldsFacts)

    await removeIssuesThatHaveBeenFixed(req, res, () => {
      expect(req.issues).toEqual([
        { entity: 'entity1', field: 'field1', resource: 'resource1' }
      ])
    })
  })

  it('handles rejected Promise in Promise.allSettled, and does not remove any issues', async () => {
    const req = {
      issues: [
        { entity: 'entity1', field: 'field1', resource: 'resource1' }
      ],
      resources: [
        { resource: 'resource1', start_date: '2022-01-01' },
        { resource: 'resource2', start_date: '2022-01-02' },
        { resource: 'resource3', start_date: '2022-01-03' }
      ]
    }
    const res = {}

    datasette.runQuery.mockRejectedValue(new Error('async error'))

    await removeIssuesThatHaveBeenFixed(req, res, () => {
      expect(req.issues).toEqual([
        { entity: 'entity1', field: 'field1', resource: 'resource1' }
      ])
    })
  })
})

describe('addFieldMappingsToIssue', () => {
  it('adds a replacement_field to an issue', () => {
    const req = {
      issues: [{ entity: 'entity1', field: 'field1' }],
      fieldMappings: [{ field: 'field1', replacement_field: 'new_field1' }]
    }
    const res = {}

    addFieldMappingsToIssue(req, res, () => {
      expect(req.issues[0]).toEqual({ entity: 'entity1', field: 'field1', replacement_field: 'new_field1' })
    })
  })

  it('adds a replacement_field to multiple issues', () => {
    const req = {
      issues: [{ entity: 'entity1', field: 'field1' }, { entity: 'entity2', field: 'field2' }],
      fieldMappings: [
        { field: 'field1', replacement_field: 'new_field1' },
        { field: 'field2', replacement_field: 'new_field2' }
      ]
    }
    const res = {}

    addFieldMappingsToIssue(req, res, () => {
      expect(req.issues[0]).toEqual({ entity: 'entity1', field: 'field1', replacement_field: 'new_field1' })
      expect(req.issues[1]).toEqual({ entity: 'entity2', field: 'field2', replacement_field: 'new_field2' })
    })
  })

  it('does not modify issue if field mapping is not found', () => {
    const req = {
      issues: [{ entity: 'entity1', field: 'field1' }],
      fieldMappings: [{ field: 'field2', replacement_field: 'new_field2' }]
    }
    const res = {}

    addFieldMappingsToIssue(req, res, () => {
      expect(req.issues[0]).toEqual({ entity: 'entity1', field: 'field1' })
    })
  })

  it('handles empty fieldMappings array', () => {
    const req = {
      issues: [{ entity: 'entity1', field: 'field1' }],
      fieldMappings: []
    }
    const res = {}

    addFieldMappingsToIssue(req, res, () => {
      expect(req.issues[0]).toEqual({ entity: 'entity1', field: 'field1' })
    })
  })

  it('handles empty issues array', () => {
    const req = {
      issues: [],
      fieldMappings: [{ field: 'field1', replacement_field: 'new_field1' }]
    }
    const res = {}

    addFieldMappingsToIssue(req, res, () => {
      expect(req.issues).toEqual([])
    })
  })

  it('handles undefined fieldMappings array', () => {
    const req = {
      issues: [{ entity: 'entity1', field: 'field1' }],
      fieldMappings: undefined
    }
    const res = {}

    addFieldMappingsToIssue(req, res, () => {
      expect(req.issues[0]).toEqual({ entity: 'entity1', field: 'field1' })
    })
  })

  it('handles undefined issues array', () => {
    const req = {
      issues: undefined,
      fieldMappings: [{ field: 'field1', replacement_field: 'new_field1' }]
    }
    const res = {}

    addFieldMappingsToIssue(req, res, () => {
      expect(req.issues).toEqual(undefined)
    })
  })
})

describe('setDataRange', () => {
  describe('tableView', () => {
    const setTableDataRange = getSetDataRange(50)

    it('should set up correct dataRange properties when pageNumber is 1', () => {
      const req = {
        recordCount: 10,
        parsedParams: { pageNumber: 1 }
      }
      const res = {}
      const next = vi.fn()

      setTableDataRange(req, res, next)

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
        recordCount: 80,
        parsedParams: { pageNumber: 2 }
      }
      const res = {}
      const next = vi.fn()

      setTableDataRange(req, res, next)

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

  describe('entityView', () => {
    const setEntityDataRange = getSetDataRange(1)

    it('should set up correct dataRange properties when pageNumber is 1', () => {
      const req = {
        recordCount: 10,
        parsedParams: { pageNumber: 1 }
      }
      const res = {}
      const next = vi.fn()

      setEntityDataRange(req, res, next)

      expect(req.dataRange).toEqual({
        minRow: 0,
        maxRow: 1,
        totalRows: 10,
        pageLength: 1,
        offset: 0,
        maxPageNumber: 10
      })
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('should set up correct dataRange properties when pageNumber is greater than 1', () => {
      const req = {
        recordCount: 10,
        parsedParams: { pageNumber: 3 }
      }
      const res = {}
      const next = vi.fn()

      setEntityDataRange(req, res, next)

      expect(req.dataRange).toEqual({
        minRow: 2,
        maxRow: 3,
        totalRows: 10,
        pageLength: 1,
        offset: 2,
        maxPageNumber: 10
      })
      expect(next).toHaveBeenCalledTimes(1)
    })
  })
})

describe('setBaseSubPath', () => {
  const lpa = 'lpa'
  const dataset = 'dataset'
  const issueType = 'issueType'
  const issueField = 'issueField'
  it('sets baseSubpath correctly when given all url params', () => {
    const req = {
      params: {
        lpa,
        dataset,
        issue_type: issueType,
        issue_field: issueField
      }
    }
    const setBaseSubPath = getSetBaseSubPath([])

    setBaseSubPath(req, {}, vi.fn())

    expect(req.baseSubpath).toEqual('/organisations/lpa/dataset/issueType/issueField')
  })

  it('sets up baseSubpath correctly when given partial params', () => {
    const req = {
      params: {
        lpa,
        dataset
      }
    }
    const setBaseSubPath = getSetBaseSubPath([])

    setBaseSubPath(req, {}, vi.fn())

    expect(req.baseSubpath).toEqual('/organisations/lpa/dataset')
  })

  it('adds additional path parts on at the end', () => {
    const req = {
      params: {
        lpa,
        dataset
      }
    }
    const setBaseSubPath = getSetBaseSubPath(['subPath'])

    setBaseSubPath(req, {}, vi.fn())

    expect(req.baseSubpath).toEqual('/organisations/lpa/dataset/subPath')
  })
})

describe('getErrorSummaryItems', () => {
  it('handles no issues are found', () => {
    const req = {
      params: {
        issue_type: 'issue-type-value',
        issue_field: 'issue-field-value'
      },
      baseSubpath: 'baseSubpath-value',
      entities: [],
      issues: [],
      headers: {
        referer: 'referer'
      }
    }

    const next = vi.fn()

    getErrorSummaryItems(req, null, next)

    expect(next).toHaveBeenCalledWith(new Error('issue count must be larger than 0'))
  })

  it('handles if every entity has the issue', () => {
    const req = {
      params: {
        issue_type: 'issue-type-value',
        issue_field: 'issue-field-value'
      },
      baseSubpath: 'baseSubpath-value',
      entities: [
        { reference: 'entity1', name: 'Name 1', amount: 100, error: 'Invalid Amount' },
        { reference: 'entity2', name: 'Name 2', amount: 200, error: ' Invalid Name' }
      ],
      issues: [
        { entity: 'entity1', error: 'Invalid Amount' },
        { entity: 'entity2', error: ' Invalid Name' }
      ]
    }

    vi.mocked(performanceDbApi.getTaskMessage).mockReturnValue('message')

    getErrorSummaryItems(req, null, vi.fn())

    const errorSummary = req.errorSummary
    expect(errorSummary.heading).toBe('')
  })

  it('handles some entities not having the issue', () => {
    const req = {
      params: {
        issue_type: 'issue-type-value',
        issue_field: 'issue-field-value'
      },
      baseSubpath: 'baseSubpath-value',
      entities: [
        { reference: 'entity1', name: 'Name 1', amount: 100, error: 'Invalid Amount' },
        { reference: 'entity2', name: 'Name 2', amount: 200, error: ' Invalid Name' },
        { reference: 'entity3', name: 'Name 3', amount: 300 }
      ],
      issues: [
        { entity: 'entity1', error: 'Invalid Amount' },
        { entity: 'entity2', error: ' Invalid Name' }
      ]
    }

    vi.mocked(performanceDbApi.getTaskMessage).mockReturnValue('message')

    getErrorSummaryItems(req, null, vi.fn())

    const errorSummary = req.errorSummary
    expect(errorSummary.heading).toBe('message')
  })

  it('Correctly sets the issue items when some entities dont have issues', () => {
    const req = {
      params: {
        issue_type: 'issue-type-value',
        issue_field: 'issue-field-value'
      },
      baseSubpath: 'baseSubpath-value/entity',
      entities: [
        { reference: 'entity1', name: 'Name 1', amount: 100, error: 'Invalid Amount' },
        { reference: 'entity2', name: 'Name 2', amount: 200, error: ' Invalid Name' },
        { reference: 'entity3', name: 'Name 3', amount: 300 }
      ],
      issues: [
        { entity: 'entity1', error: 'Invalid Amount' },
        { entity: 'entity2', error: ' Invalid Name' }
      ]
    }

    vi.mocked(performanceDbApi.getTaskMessage).mockReturnValue('issue')

    getErrorSummaryItems(req, null, vi.fn())

    const errorSummary = req.errorSummary
    expect(errorSummary.items).toEqual([
      {
        html: 'issue in entity entity1',
        href: 'baseSubpath-value/entity/1'
      },
      {
        html: 'issue in entity entity2',
        href: 'baseSubpath-value/entity/2'
      }
    ])
  })

  it('handles no entities provided, but a resource provided with less issues than entries', () => {
    const req = {
      params: {
        issue_type: 'issue-type-value',
        issue_field: 'issue-field-value'
      },
      baseSubpath: 'baseSubpath-value/entry',
      resources: [
        {
          entry_count: 3
        }
      ],
      issues: [
        { entry_number: 1, error: 'Invalid Amount' },
        { entry_number: 2, error: ' Invalid Name' }
      ]
    }

    vi.mocked(performanceDbApi.getTaskMessage).mockReturnValue('issue')

    getErrorSummaryItems(req, null, vi.fn())

    const errorSummary = req.errorSummary
    expect(errorSummary.items).toEqual([
      {
        html: 'issue in entry 1',
        href: 'baseSubpath-value/entry/1'
      },
      {
        html: 'issue in entry 2',
        href: 'baseSubpath-value/entry/2'
      }
    ])
  })
})

describe('prepareEntityIssueDetailsTemplateParams', () => {
  const req = {
    parsedParams: { pageNumber: 1, issue_type: 'some-issue-type' },
    entry: 'some-entry',
    pagination: 'some-pagination',
    errorSummary: 'some-error-summary',
    dataRange: 'some-data-range',
    dataset: 'some-dataset',
    orgInfo: 'some-org-info'
  }

  const res = {}

  beforeEach(() => {
    req.templateParams = undefined
  })

  it('should set req.templateParams with expected values', () => {
    const next = vi.fn()
    prepareIssueDetailsTemplateParams(req, res, next)

    expect(req.templateParams).toEqual({
      organisation: 'some-org-info',
      dataset: 'some-dataset',
      errorSummary: 'some-error-summary',
      entry: 'some-entry',
      issueType: 'some-issue-type',
      pagination: 'some-pagination',
      pageNumber: 1,
      dataRange: 'some-data-range'
    })
  })

  it('should call next function', () => {
    const next = vi.fn()
    prepareIssueDetailsTemplateParams(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })
})
