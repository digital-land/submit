import { describe, it, expect, vi } from 'vitest'
import { addIssuesToEntities, extractJsonFieldFromEntities, formatErrorSummaryParams, getPaginationOptions, isResourceAccessible, isResourceIdNotInParams, isResourceNotAccessible, logPageError, nestEntityFields, paginateEntitiesAndPullOutCount, pullOutDatasetSpecification, replaceUnderscoreWithHyphenForEntities, takeResourceIdFromParams } from '../../../src/middleware/common.middleware'
import logger from '../../../src/utils/logger'

vi.mock('../../../src/utils/logger')

describe('logPageError', () => {
  it('logs an error with handlerName', () => {
    const loggerMock = vi.fn()
    logger.warn = loggerMock

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

    it('handles default pageNumber as 1', () => {
      const resultsCount = 10
      const getPaginationOptionsMiddleware = getPaginationOptions(resultsCount)
      const req = { params: {} }
      const res = {}
      const next = vi.fn()

      getPaginationOptionsMiddleware(req, res, next)
      expect(req.pagination).toBeDefined()
      expect(req.pagination.offset).toBe(0)
      expect(req.pagination.limit).toBe(10)
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
})

describe('addIssuesToEntities', () => {
  it('adds issues to entities correctly', () => {
    const req = {
      entities: [
        { entryNumber: 1, name: { value: 'John' }, age: { value: 30 } },
        { entryNumber: 2, name: { value: 'Jane' }, age: { value: 25 } }
      ],
      issuesWithReferences: [
        { entryNumber: 1, field: 'name', value: 'nameIssueValue' },
        { entryNumber: 1, field: 'age', value: 'ageIssueValue' },
        { entryNumber: 2, field: 'name', value: 'nameIssueValue2' }
      ]
    }
    const res = {}
    const next = vi.fn()

    addIssuesToEntities(req, res, next)

    expect(req.entitiesWithIssues).toHaveLength(2)
    expect(req.entitiesWithIssues[0]).toEqual({
      entryNumber: 1,
      name: { value: 'nameIssueValue', issue: { entryNumber: 1, field: 'name', value: 'nameIssueValue' } },
      age: { value: 'ageIssueValue', issue: { entryNumber: 1, field: 'age', value: 'ageIssueValue' } }
    })
    expect(req.entitiesWithIssues[1]).toEqual({
      entryNumber: 2,
      name: { value: 'nameIssueValue2', issue: { entryNumber: 2, field: 'name', value: 'nameIssueValue2' } },
      age: { value: 25 }
    })
  })

  it('calls next function', () => {
    const req = {
      entities: [
        { entryNumber: 1, name: { value: 'John' } }
      ],
      issuesWithReferences: [
        { entryNumber: 1, field: 'name', value: 'Invalid name' }
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
