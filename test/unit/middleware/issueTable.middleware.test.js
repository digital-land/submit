import { describe, it, expect, vi } from 'vitest'
import { issueTypeAndFieldShouldRedirect, notIssueHasEntity, prepareTableParams, prepareTemplateParams, redirectToEntityView, setRecordCount } from '../../../src/middleware/issueTable.middleware'

vi.mock('../../../src/services/performanceDbApi.js')

describe('issueTableMiddleware', () => {
  describe('set record count', () => {
    it('sets req.recordCount to the length of req.issues', () => {
      const req = { issues: [{}, {}, {}] }
      const res = {}
      const next = vi.fn()

      setRecordCount(req, res, next)

      expect(req.recordCount).toBe(3)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('does not modify req.recordCount if req.issues is undefined', () => {
      const req = {}
      const res = {}
      const next = vi.fn()

      setRecordCount(req, res, next)

      expect(req.recordCount).toBe(undefined)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('does not modify req.recordCount if req.issues is null', () => {
      const req = { issues: null }
      const res = {}
      const next = vi.fn()

      setRecordCount(req, res, next)

      expect(req.recordCount).toBe(undefined)
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
      },
      baseSubpath: '/organisations/lpa-value/dataset-value/issue-type-value/issue-field-value'
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
              html: "<a href='/organisations/lpa-value/dataset-value/issue-type-value/issue-field-value/entity/1'>entity1</a>",
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
              html: "<a href='/organisations/lpa-value/dataset-value/issue-type-value/issue-field-value/entity/2'>entity2</a>",
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

  describe('prepareTemplateParams', () => {
    it('should set templateParams object with all required props', () => {
      const req = {
        tableParams: 'some-table-params',
        orgInfo: 'some-org-info',
        dataset: 'some-dataset',
        errorSummary: 'some-error-summary',
        params: { issue_type: 'some-issue-type' },
        pagination: 'some-pagination',
        dataRange: 'some-data-range'
      }
      const res = {}
      const next = function () {}

      prepareTemplateParams(req, res, next)

      expect(req.templateParams).to.be.an('object')
      expect(req.templateParams).to.haveOwnProperty('tableParams')
      expect(req.templateParams).to.haveOwnProperty('organisation')
      expect(req.templateParams).to.haveOwnProperty('dataset')
      expect(req.templateParams).to.haveOwnProperty('errorSummary')
      expect(req.templateParams).to.haveOwnProperty('issueType')
      expect(req.templateParams).to.haveOwnProperty('pagination')
      expect(req.templateParams).to.haveOwnProperty('dataRange')
    })
  })

  describe('notIssueHasEntity', () => {
    it('should return true if there are no issues', () => {
      const req = { issues: [] }
      const res = {}
      const next = function () {}

      expect(notIssueHasEntity(req, res, next)).toEqual(true)
    })

    it('should return false if there are issues', () => {
      const req = { issues: [{ entity: 'some-entity' }] }
      const res = {}
      const next = function () {}

      expect(notIssueHasEntity(req, res, next)).toEqual(false)
    })

    it('should not modify the request object', () => {
      const req = { issues: [{ entity: 'some-entity' }] }
      const res = {}
      const next = function () {}

      notIssueHasEntity(req, res, next)

      expect(req.issues).toHaveLength(1)
    })
  })

  describe('issueTypeAndFieldShouldRedirect', () => {
    it('should redirect when matching issue type and field are found', () => {
      const req = {
        params: { issue_type: 'missing value', issue_field: 'reference' }
      }
      const res = {}

      expect(issueTypeAndFieldShouldRedirect(req, res, vi.fn())).toEqual(true)
    })

    it('should not redirect when no matching issue type and field are found', () => {
      const req = {
        params: { issue_type: 'some-other-type', issue_field: 'some-other-field' }
      }
      const res = {}

      expect(issueTypeAndFieldShouldRedirect(req, res, vi.fn())).toEqual(false)
    })

    it('should not redirect when issue type is not provided', () => {
      const req = {
        params: { issue_field: 'some-field' }
      }
      const res = {}

      expect(issueTypeAndFieldShouldRedirect(req, res, vi.fn())).toEqual(false)
    })

    it('should not redirect when issue field is not provided', () => {
      const req = {
        params: { issue_type: 'some-type' }
      }
      const res = {}

      expect(issueTypeAndFieldShouldRedirect(req, res, vi.fn())).toEqual(false)
    })

    it('should redirect when reference values are not unique', () => {
      const req = {
        params: { issue_type: 'reference values are not unique', issue_field: 'reference' }
      }
      const res = {}

      expect(issueTypeAndFieldShouldRedirect(req, res, vi.fn())).toEqual(true)
    })

    it('should redirect when unknown entity - missing reference', () => {
      const req = {
        params: { issue_type: 'unknown entity - missing reference', issue_field: 'entity' }
      }
      const res = {}

      expect(issueTypeAndFieldShouldRedirect(req, res, vi.fn())).toEqual(true)
    })
  })

  describe('redirectToEntityView', () => {
    it('should redirect to the correct URL', async () => {
      const req = {
        params: {
          lpa: 'some-lpa',
          dataset: 'some-dataset',
          issue_type: 'some-issue-type',
          issue_field: 'some-issue-field'
        }
      }
      const res = { redirect: vi.fn() }

      await redirectToEntityView(req, res, vi.fn())

      expect(res.redirect).toHaveBeenCalledTimes(1)
      expect(res.redirect).toHaveBeenCalledWith(`/organisations/${req.params.lpa}/${req.params.dataset}/${req.params.issue_type}/${req.params.issue_field}/entry`)
    })

    it('should not call next when redirecting', async () => {
      const req = {
        params: {
          lpa: 'some-lpa',
          dataset: 'some-dataset',
          issue_type: 'some-issue-type',
          issue_field: 'some-issue-field'
        }
      }
      const res = { redirect: vi.fn() }
      const next = vi.fn()

      await redirectToEntityView(req, res, next)

      expect(next).not.toHaveBeenCalled()
    })
  })
})
