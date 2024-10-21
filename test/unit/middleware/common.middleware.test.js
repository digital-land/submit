import { describe, it, expect, vi } from 'vitest'
import { addDatabaseFieldToSpecification, addDatasetFieldsToIssues, addIssuesToEntities, createPaginationTemplateParams, extractJsonFieldFromEntities, formatErrorSummaryParams, getPaginationOptions, isResourceAccessible, isResourceIdNotInParams, isResourceNotAccessible, logPageError, nestEntityFields, paginateEntitiesAndPullOutCount, pullOutDatasetSpecification, replaceUnderscoreWithHyphenForEntities, takeResourceIdFromParams } from '../../../src/middleware/common.middleware'
import logger from '../../../src/utils/logger'

vi.mock('../../../src/utils/logger')

describe('logPageError', () => {
  it('logs an error with handlerName', () => {
    const loggerMock = vi.spyOn(logger, 'warn')

    const err = new Error('Test error')
    const req = { handlerName: 'testHandler', originalUrl: '/test' }
    const res = {}
    const next = vi.fn()
    logPageError(err, req, res, next)
    expect(loggerMock).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('resource middleware', () => {
  describe('isResourceAccessible', () => {
    it('returns true if resourceStatus is 200', () => {
      const req = { resourceStatus: { status: '200' } }
      expect(isResourceAccessible(req)).toBe(true)
    })
    it('returns false if resourceStatus is not 200', () => {
      const req = { resourceStatus: { status: '404' } }
      expect(isResourceAccessible(req)).toBe(false)
    })
  })

  describe('isResourceNotAccessible', () => {
    it('returns false if resourceStatus is 200', () => {
      const req = { resourceStatus: { status: '200' } }
      expect(isResourceNotAccessible(req)).toBe(false)
    })
    it('returns true if resourceStatus is not 200', () => {
      const req = { resourceStatus: { status: '404' } }
      expect(isResourceNotAccessible(req)).toBe(true)
    })
  })

  describe('isResourceIdNotInParams', () => {
    it('returns true if resourceId is in params', () => {
      const req = { params: { resourceId: 'testId' } }
      expect(isResourceIdNotInParams(req)).toBe(false)
    })
    it('returns false if resourceId is not in params', () => {
      const req = { params: {} }
      expect(isResourceIdNotInParams(req)).toBe(true)
    })
  })

  describe('takeResourceIdFromParams', () => {
    it('takes the resourceId from params', () => {
      const req = { params: { resourceId: 'testId' } }
      takeResourceIdFromParams(req)
      expect(req.resource).toEqual({ resource: 'testId' })
    })
  })
})

describe('formatErrorSummaryParams', () => {
  it('formats error summary params with no entities', () => {
    const req = {
      params: { lpa: 'testLpa', dataset: 'testDataset', issue_type: 'testIssueType', issue_field: 'testIssueField' },
      entityCount: { entity_count: 10 },
      issuesWithReferences: [],
      issuesWithoutReferences: [{ field: 'field1', issue_type: 'type1', message: 'message1', reference: { value: '1' } }],
      entities: []
    }
    const res = {}
    const next = vi.fn()
    formatErrorSummaryParams(req, res, next)
    expect(req.errorSummary).toBeDefined()
    expect(req.errorSummary.heading).toBeUndefined()
    expect(req.errorSummary.items).toHaveLength(1)
    expect(req.errorSummary.items[0].html).toMatchSnapshot()
  })

  it('formats error summary params with some entities', () => {
    const req = {
      params: { lpa: 'testLpa', dataset: 'testDataset', issue_type: 'testIssueType', issue_field: 'testIssueField' },
      entityCount: { entity_count: 10 },
      issuesWithReferences: [{ field: 'field1', issue_type: 'type1', message: 'message1', reference: { value: '1' } }],
      issuesWithoutReferences: [{ field: 'field2', issue_type: 'type2', message: 'message2', reference: { value: '2' } }],
      entities: [
        { reference: { value: '1' } },
        { reference: { value: '2' } }
      ]
    }
    const res = {}
    const next = vi.fn()
    formatErrorSummaryParams(req, res, next)
    expect(req.errorSummary).toBeDefined()
    expect(req.errorSummary.heading).toMatchSnapshot()
    expect(req.errorSummary.items).toHaveLength(2)
    expect(req.errorSummary.items[0].html).toMatchSnapshot()
    expect(req.errorSummary.items[0].href).toMatchSnapshot()
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

  it('pulls out the data specification', () => {
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

describe('pagination', () => {
  describe('getPaginationOptions', () => {
    it('sets pagination options correctly', () => {
      const resultsCount = 10
      const getPaginationOptionsMiddleware = getPaginationOptions(resultsCount)
      const req = { params: { pageNumber: 2 } }
      const res = {}
      const next = vi.fn()

      getPaginationOptionsMiddleware(req, res, next)
      expect(req.pagination).toBeDefined()
      expect(req.pagination.offset).toBe(10)
      expect(req.pagination.limit).toBe(10)
    })

    it('calls next function', () => {
      const resultsCount = 10
      const getPaginationOptionsMiddleware = getPaginationOptions(resultsCount)
      const req = { params: { pageNumber: 1 } }
      const res = {}
      const next = vi.fn()

      getPaginationOptionsMiddleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('paginateEntitiesAndPullOutCount', () => {
    it('sets entitiesWithIssuesCount to the total number of entities', () => {
      const req = { entities: [{}, {}, {}], params: { pageNumber: 1 }, pagination: { offset: 0, limit: 2 } }
      const res = {}
      const next = vi.fn()

      paginateEntitiesAndPullOutCount(req, res, next)
      expect(req.entitiesWithIssuesCount).toBe(3)
    })

    it('paginates entities correctly', () => {
      const req = { entities: [{}, {}, {}, {}, {}, {}], params: { pageNumber: 2 }, pagination: { offset: 2, limit: 2 } }
      const res = {}
      const next = vi.fn()

      paginateEntitiesAndPullOutCount(req, res, next)
      expect(req.entities).toHaveLength(2)
      expect(req.entities).toEqual([{}, {}])
    })

    it('calls next function', () => {
      const req = { entities: [{}, {}, {}], params: { pageNumber: 1 }, pagination: { offset: 0, limit: 2 } }
      const res = {}
      const next = vi.fn()

      paginateEntitiesAndPullOutCount(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

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
})

describe('extractJsonFieldFromEntities', () => {
  it('extracts and parses json field from entities', () => {
    const req = {
      entities: [
        { id: 1, json: '{"field1": "value1", "field2": "value2"}' },
        { id: 2, json: '{"field3": "value3", "field4": "value4"}' }
      ]
    }
    const res = {}
    const next = vi.fn()

    extractJsonFieldFromEntities(req, res, next)

    expect(req.entities).toHaveLength(2)
    expect(req.entities[0]).toEqual({
      id: 1,
      field1: 'value1',
      field2: 'value2'
    })
    expect(req.entities[1]).toEqual({
      id: 2,
      field3: 'value3',
      field4: 'value4'
    })
  })

  it('calls next function', () => {
    const req = {
      entities: [
        { id: 1, json: '{"field1": "value1", "field2": "value2"}' }
      ]
    }
    const res = {}
    const next = vi.fn()

    extractJsonFieldFromEntities(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles entities with no json field', () => {
    const req = {
      entities: [
        { id: 1 }
      ]
    }
    const res = {}
    const next = vi.fn()

    extractJsonFieldFromEntities(req, res, next)
    expect(req.entities).toHaveLength(1)
    expect(req.entities[0]).toEqual({ id: 1 })
  })

  it('handles entities with empty json field', () => {
    const req = {
      entities: [
        { id: 1 }
      ]
    }
    const res = {}
    const next = vi.fn()

    extractJsonFieldFromEntities(req, res, next)
    expect(req.entities).toHaveLength(1)
    expect(req.entities[0]).toEqual({ id: 1 })
  })

  it('handles entities with invalid json field', () => {
    const req = {
      entities: [
        { id: 1, json: '{ invalid json }' }
      ]
    }
    const res = {}
    const next = vi.fn()

    extractJsonFieldFromEntities(req, res, next)

    expect(req.entities).toHaveLength(1)
    expect(req.entities[0]).toEqual({ id: 1 })
  })
})

describe('replaceUnderscoreWithHyphenForEntities', () => {
  it('replaces underscore with hyphen in entity keys', () => {
    const req = {
      entities: [
        { id: 1, foo_bar: 'value1', baz_qux: 'value2' },
        { id: 2, quux_foo: 'value3', bar_baz: 'value4' }
      ]
    }
    const res = {}
    const next = vi.fn()

    replaceUnderscoreWithHyphenForEntities(req, res, next)

    expect(req.entities).toHaveLength(2)
    expect(req.entities[0]).toEqual({
      id: 1,
      'foo-bar': 'value1',
      'baz-qux': 'value2'
    })
    expect(req.entities[1]).toEqual({
      id: 2,
      'quux-foo': 'value3',
      'bar-baz': 'value4'
    })
  })

  it('calls next function', () => {
    const req = {
      entities: [
        { id: 1, foo_bar: 'value1' }
      ]
    }
    const res = {}
    const next = vi.fn()

    replaceUnderscoreWithHyphenForEntities(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles entities with no underscore in keys', () => {
    const req = {
      entities: [
        { id: 1, foobar: 'value1' }
      ]
    }
    const res = {}
    const next = vi.fn()

    replaceUnderscoreWithHyphenForEntities(req, res, next)
    expect(req.entities).toHaveLength(1)
    expect(req.entities[0]).toEqual({ id: 1, foobar: 'value1' })
  })
})

describe('nestEntityFields', () => {
  it('nests entity fields correctly', () => {
    const req = {
      entities: [
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 }
      ],
      specification: {
        fields: [
          { field: 'name' },
          { field: 'age' }
        ]
      }
    }
    const res = {}
    const next = vi.fn()

    nestEntityFields(req, res, next)

    expect(req.entities).toHaveLength(2)
    expect(req.entities[0]).toEqual({
      id: 1,
      name: { value: 'John' },
      age: { value: 30 }
    })
    expect(req.entities[1]).toEqual({
      id: 2,
      name: { value: 'Jane' },
      age: { value: 25 }
    })
  })

  it('calls next function', () => {
    const req = {
      entities: [
        { id: 1, name: 'John' }
      ],
      specification: {
        fields: [
          { field: 'name' }
        ]
      }
    }
    const res = {}
    const next = vi.fn()

    nestEntityFields(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles entities with no specification fields', () => {
    const req = {
      entities: [
        { id: 1, name: 'John' }
      ],
      specification: {
        fields: []
      }
    }
    const res = {}
    const next = vi.fn()

    nestEntityFields(req, res, next)
    expect(req.entities).toHaveLength(1)
    expect(req.entities[0]).toEqual({ id: 1, name: 'John' })
  })

  it('handles entities with undefined specification', () => {
    const req = {
      entities: [
        { id: 1, name: 'John' }
      ],
      specification: null
    }
    const res = {}
    const next = vi.fn()

    nestEntityFields(req, res, next)

    expect(next).toHaveBeenCalledWith(new Error('Specification is not defined'))
  })
})

describe('addDatasetFieldsToIssues', () => {
  it('adds dataset field to issues', () => {
    const req = {
      issuesWithReferences: [
        { entryNumber: 1, field: 'name', value: 'nameIssueValue' },
        { entryNumber: 2, field: 'age', value: 'ageIssueValue' }
      ],
      specification: {
        fields: [
          { field: 'name', datasetField: 'fullName' },
          { field: 'age', datasetField: 'Age' }
        ]
      }
    }
    const res = {}
    const next = vi.fn()

    addDatasetFieldsToIssues(req, res, next)
    expect(req.issuesWithReferences).toHaveLength(2)
    expect(req.issuesWithReferences[0]).toEqual({
      entryNumber: 1,
      field: 'name',
      value: 'nameIssueValue',
      datasetField: 'fullName'
    })
    expect(req.issuesWithReferences[1]).toEqual({
      entryNumber: 2,
      field: 'age',
      value: 'ageIssueValue',
      datasetField: 'Age'
    })
  })

  it('handles special case for GeoX,GeoY field', () => {
    const req = {
      issuesWithReferences: [
        { entryNumber: 1, field: 'GeoX,GeoY', value: ' GeoX,GeoY issue value' }
      ]
    }
    const res = {}
    const next = vi.fn()

    addDatasetFieldsToIssues(req, res, next)
    expect(req.issuesWithReferences).toHaveLength(1)
    expect(req.issuesWithReferences[0]).toEqual({
      entryNumber: 1,
      field: 'GeoX,GeoY',
      value: ' GeoX,GeoY issue value',
      datasetField: 'point'
    })
  })

  it('handles issues with no matching specification field', () => {
    const req = {
      issuesWithReferences: [
        { entryNumber: 1, field: 'unknownField', value: 'unknownFieldValue' }
      ],
      specification: {
        fields: []
      }
    }
    const res = {}
    const next = vi.fn()

    addDatasetFieldsToIssues(req, res, next)
    expect(req.issuesWithReferences).toHaveLength(1)
    expect(req.issuesWithReferences[0]).toEqual({
      entryNumber: 1,
      field: 'unknownField',
      value: 'unknownFieldValue',
      datasetField: 'unknownField'
    })
  })

  it('calls next function', () => {
    const req = {
      issuesWithReferences: [
        { entryNumber: 1, field: 'name', value: 'nameIssueValue' }
      ],
      specification: {
        fields: [
          { field: 'name', datasetField: 'fullName' }
        ]
      }
    }
    const res = {}
    const next = vi.fn()

    addDatasetFieldsToIssues(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('addIssuesToEntities', () => {
  it('adds issues to entities correctly', () => {
    const req = {
      entities: [
        { entryNumber: 1, name: { value: 'John' }, age: { value: 30 } },
        { entryNumber: 2, name: { value: 'Jane' }, age: { value: 25 } }
      ],
      issuesWithReferences: [
        { entryNumber: 1, field: 'name', datasetField: 'name', value: 'nameIssueValue' },
        { entryNumber: 1, field: 'age', datasetField: 'age', value: 'ageIssueValue' },
        { entryNumber: 2, field: 'name', datasetField: 'name', value: 'nameIssueValue2' }
      ]
    }
    const res = {}
    const next = vi.fn()

    addIssuesToEntities(req, res, next)

    expect(req.entitiesWithIssues).toHaveLength(2)
    expect(req.entitiesWithIssues[0]).toEqual({
      entryNumber: 1,
      name: { value: 'nameIssueValue', issue: { entryNumber: 1, field: 'name', datasetField: 'name', value: 'nameIssueValue' } },
      age: { value: 'ageIssueValue', issue: { entryNumber: 1, field: 'age', datasetField: 'age', value: 'ageIssueValue' } }
    })
    expect(req.entitiesWithIssues[1]).toEqual({
      entryNumber: 2,
      name: { value: 'nameIssueValue2', issue: { entryNumber: 2, field: 'name', datasetField: 'name', value: 'nameIssueValue2' } },
      age: { value: 25 }
    })
  })

  it('calls next function', () => {
    const req = {
      entities: [
        { entryNumber: 1, name: { value: 'John' } }
      ],
      issuesWithReferences: [
        { entryNumber: 1, field: 'name', value: 'Invalid name', datasetField: 'name' }
      ]
    }
    const res = {}
    const next = vi.fn()

    addIssuesToEntities(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles entities with no issues', () => {
    const req = {
      entities: [
        { entryNumber: 1, name: { value: 'John' } }
      ],
      issuesWithReferences: []
    }
    const res = {}
    const next = vi.fn()

    addIssuesToEntities(req, res, next)
    expect(req.entitiesWithIssues).toHaveLength(1)
    expect(req.entitiesWithIssues[0]).toEqual({
      entryNumber: 1,
      name: { value: 'John' }
    })
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
