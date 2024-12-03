import { describe, it, vi, expect } from 'vitest'
import { getIssueDetails, getIssueField, setRecordCount } from '../../../src/middleware/entityIssueDetails.middleware.js'

vi.mock('../../../src/services/performanceDbApi.js')

describe('issueDetails.middleware.js', () => {
  describe('getIssueField', () => {
    it('returns an object with key, value, and classes properties', () => {
      const text = 'Issue Text'
      const html = '<p>Issue HTML</p>'
      const classes = ['issue-class']
      const result = getIssueField(text, html, classes)

      expect(result).toEqual({
        key: { text },
        value: { html },
        classes
      })
    })

    it('returns an object with default classes if classes are not provided', () => {
      const text = 'Issue Text'
      const html = '<p>Issue HTML</p>'
      const result = getIssueField(text, html)

      expect(result).toEqual({
        key: { text },
        value: { html }
      })
    })
  })

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

  describe('prepareEntity', () => {

  })

  describe('prepareEntityIssueDetailsTemplateParams', () => {

  })

  describe('getIssueDetails', () => {
    it('should call render using the provided template params and correct view', () => {
      const req = {
        templateParams: {
          organisation: {
            name: 'mock lpa',
            organisation: 'ORG'
          },
          dataset: {
            name: 'mock dataset',
            dataset: 'mock-dataset',
            collection: 'mock-collection'
          },
          errorSummary: {
            heading: 'mockMessageFor: 0',
            items: [
              {
                html: 'mock task message 1 in record 1',
                href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/1'
              }
            ]
          },
          entry: {
            title: 'entry: 1',
            fields: [
              {
                key: { text: 'start-date' },
                value: { html: '<p class="govuk-error-message">mock message</p>02-02-2022' },
                classes: 'dl-summary-card-list__row--error'
              },
              {
                classes: '',
                key: {
                  text: 'geometry'
                },
                value: {
                  html: 'POINT(0 0)'
                }
              }
            ],
            geometries: ['POINT(0 0)']
          },
          issueType: 'test-issue-type',
          pagination: {
            items: [{
              current: true,
              href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/1',
              number: 1,
              type: 'number'
            }]
          },
          pageNumber: 1,
          dataRange: {
            minRow: 0,
            maxRow: 50,
            totalRows: 150
          }
        }
      }

      const res = {
        render: vi.fn()
      }

      getIssueDetails(req, res, () => {})

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/issueDetails.html', req.templateParams)
    })
  })
})
