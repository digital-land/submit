import { describe, it, expect, vi } from 'vitest'
import { getDataRange, prepareTableParams, setBaseSubpath } from '../../../src/middleware/issueTable.middleware'

describe('issueTableMiddleware', () => {
  describe('setBaseSubpath', () => {
    it('sets baseSubpath correctly', () => {
      const req = {
        params: {
          lpa: 'lpa-value',
          dataset: 'dataset-value',
          issue_type: 'issue-type-value',
          issue_field: 'issue-field-value'
        }
      }
      const res = {}
      const next = vi.fn()

      setBaseSubpath(req, res, next)

      expect(req.baseSubpath).toBe('/organisations/lpa-value/dataset-value/issue-type-value/issue-field-value')
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('getDataRange', () => {
    it('sets dataRange correctly', () => {
      const req = {
        issues: [
          { entity: 'entity1', field: 'field1', resource: 'resource1' },
          { entity: 'entity2', field: 'field2', resource: 'resource1' },
          { entity: 'entity3', field: 'field3', resource: 'resource1' }
        ],
        parsedParams: {
          pageNumber: 1
        }
      }
      const next = vi.fn()

      getDataRange(req, {}, next)

      expect(req.dataRange).toEqual({
        minRow: 0,
        maxRow: 3,
        totalRows: 3,
        maxPageNumber: 1,
        pageLength: 50
      })
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('sets dataRange correctly for last page', () => {
      const req = {
        issues: {
          length: 160
        },
        parsedParams: {
          pageNumber: 2
        }
      }
      const next = vi.fn()

      getDataRange(req, {}, next)

      expect(req.dataRange).toEqual({
        minRow: 50,
        maxRow: 100,
        totalRows: 160,
        maxPageNumber: 4,
        pageLength: 50
      })
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('sets dataRange correctly for first page', () => {
      const req = {
        issues: {
          length: 160
        },
        parsedParams: {
          pageNumber: 1
        }
      }
      const next = vi.fn()

      getDataRange(req, {}, next)

      expect(req.dataRange).toEqual({
        minRow: 0,
        maxRow: 50,
        totalRows: 160,
        maxPageNumber: 4,
        pageLength: 50
      })
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('prepareTableParams', () => {
    const req = {
      entities: [
        { entity: 'entity1', reference: 'entity1', name: 'Name 1', amount: 100 },
        { entity: 'entity2', reference: 'entity2', name: 'Name 2', amount: 200 },
        { entity: 'entity3', reference: 'entity3', name: 'Name 3', amount: 300 }
      ],
      issues: [
        { entity: 'entity1', field: 'amount', issue_type: 'Invalid Amount' },
        { entity: 'entity2', field: 'name', issue_type: 'Invalid Name' }
      ],
      uniqueDatasetFields: ['reference', 'name', 'amount'],
      dataRange: {
        minRow: 0,
        maxRow: 50,
        totalRows: 3,
        maxPageNumber: 1,
        pageLength: 50
      },
      params: {
        lpa: 'lpa-value',
        dataset: 'dataset-value',
        issue_type: 'issue-type-value',
        issue_field: 'issue-field-value'
      }
    }

    it('correctly sets tableParams.fields', async () => {
      const reqCopy = JSON.parse(JSON.stringify(req))
      const next = vi.fn()

      await prepareTableParams(reqCopy, {}, next)

      expect(reqCopy.tableParams).toHaveProperty('fields')
      expect(reqCopy.tableParams.fields).toEqual(['reference', 'name', 'amount'])
    })

    it('correctly sets tableParams.columns', async () => {
      const reqCopy = JSON.parse(JSON.stringify(req))
      const next = vi.fn()

      await prepareTableParams(reqCopy, {}, next)

      expect(reqCopy.tableParams).toHaveProperty('columns')
      expect(reqCopy.tableParams.columns).toHaveLength(3)
      expect(reqCopy.tableParams.columns).toEqual(['reference', 'name', 'amount'])
    })

    it('filters out rows without errors', async () => {
      const reqCopy = JSON.parse(JSON.stringify(req))
      const next = vi.fn()

      await prepareTableParams(reqCopy, {}, next)

      expect(reqCopy.tableParams.rows).toHaveLength(2)
    })

    it('correctly formats row values', async () => {
      const reqCopy = JSON.parse(JSON.stringify(req))
      const next = vi.fn()

      await prepareTableParams(reqCopy, {}, next)

      const expectedRows = [
        {
          columns: {
            reference: {
              html: "<a href='/organisations/lpa-value/dataset-value/issue-type-value/issue-field-value/entry/1'>entity1</a>",
              error: undefined
            },
            name: {
              value: 'Name 1',
              error: undefined
            },
            amount: {
              value: 100,
              error: {
                message: 'Invalid Amount'
              }
            }
          }
        },
        {
          columns: {
            reference: {
              html: "<a href='/organisations/lpa-value/dataset-value/issue-type-value/issue-field-value/entry/2'>entity2</a>",
              error: undefined
            },
            name: {
              value: 'Name 2',
              error: {
                message: 'Invalid Name'
              }
            },
            amount: {
              value: 200,
              error: undefined
            }
          }
        }
      ]

      expect(reqCopy.tableParams.rows).toEqual(expectedRows)
    })
  })

  describe('getErrorSummaryItems', () => {
    it('gets errorSummaryItems', () => {
      // test implementation
    })
  })

  describe('prepareTemplateParams', () => {
    it('prepares templateParams', () => {
      // test implementation
    })
  })

  describe('notIssueHasEntity', () => {
    it('returns false when entities are present', () => {
      // test implementation
    })

    it('returns true when entities are not present', () => {
      // test implementation
    })
  })

  describe('issueTypeAndFieldShouldRedirect', () => {
    it('returns true when issue type and field match', () => {
      // test implementation
    })

    it('returns false when issue type and field do not match', () => {
      // test implementation
    })
  })

  describe('redirectToEntityView', () => {
    it('redirects to entity view', () => {
      // test implementation
    })
  })

  describe('getIssueTable', () => {
    it('gets issue table', () => {
      // test implementation
    })
  })

  describe('show404IfPageNotInRange', () => {
    it('shows 404 when page number is out of range', () => {
      // test implementation
    })

    it('does not show 404 when page number is in range', () => {
      // test implementation
    })
  })
})
