import { describe, it, expect, vi } from 'vitest'
import { formatErrorSummaryParams, isResourceAccessible, isResourceIdNotInParams, isResourceNotAccessible, logPageError, pullOutDatasetSpecification, reformatIssuesToBeByEntryNumber, takeResourceIdFromParams } from '../../../src/middleware/common.middleware'
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

describe('reformatIssuesToBeByEntryNumber', () => {
  it('reformats the issues by entry number', async () => {
    const req = { issues: [{ entry_number: '1', issue: 'testIssue' }, { entry_number: '1', issue: 'testIssue2' }, { entry_number: '2', issue: 'testIssue3' }] }
    const res = {}
    const next = vi.fn()
    await reformatIssuesToBeByEntryNumber(req, res, next)
    expect(req.issuesByEntryNumber).toBeDefined()
    expect(req.issuesByEntryNumber['1']).toHaveLength(2)
    expect(req.issuesByEntryNumber['2']).toHaveLength(1)
  })
})

describe('formatErrorSummaryParams', () => {
  it('formats the error summary params', async () => {
    const req = {
      params: { lpa: 'testLpa', dataset: 'testDataset', issue_type: 'testIssueType', issue_field: 'testIssueField' },
      issuesByEntryNumber: { 1: [{ issue: 'testIssue' }], 2: [{ issue: 'testIssue2' }] },
      entityCount: { entity_count: 10 },
      issueEntitiesCount: 5
    }
    const res = {}
    const next = vi.fn()
    formatErrorSummaryParams(req, res, next)
    expect(req.errorSummary).toBeDefined()
    expect(req.errorSummary.heading).toBeDefined()
    expect(req.errorSummary.items).toHaveLength(2)
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
