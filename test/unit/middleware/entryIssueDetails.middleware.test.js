import { describe, it, expect, vi } from 'vitest'
import { addResourceMetaDataToResources, getIssueDetails, prepareEntry, setRecordCount } from '../../../src/middleware/entryIssueDetails.middleware'

describe('entryIssueDetails.middleware.test.js', () => {
  describe('addResourceMetaDataToResources', () => {
    it('adds metadata to resources when metadata is found', () => {
      const req = {
        resources: [
          { resource: 'resource1', foo: 'bar' },
          { resource: 'resource2', baz: 'qux' }
        ],
        resourceMetaData: [
          { resource: 'resource1', description: 'Resource 1 desc' },
          { resource: 'resource3', description: 'Resource 3 desc' }
        ]
      }
      const res = {}
      const next = vi.fn()

      addResourceMetaDataToResources(req, res, next)

      expect(req.resources).toEqual([
        { resource: 'resource1', foo: 'bar', description: 'Resource 1 desc' },
        { resource: 'resource2', baz: 'qux' }
      ])
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('leaves resources unchanged when metadata is not found', () => {
      const req = {
        resources: [
          { resource: 'resource1', foo: 'bar' },
          { resource: 'resource2', baz: 'qux' }
        ],
        resourceMetaData: [
          { resource: 'resource3', metaData: { description: 'Resource 3 desc' } }
        ]
      }
      const res = {}
      const next = vi.fn()

      addResourceMetaDataToResources(req, res, next)

      expect(req.resources).toEqual([
        { resource: 'resource1', foo: 'bar' },
        { resource: 'resource2', baz: 'qux' }
      ])
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('calls next() when done', () => {
      const req = {
        resources: [],
        resourceMetaData: []
      }
      const res = {}
      const next = vi.fn()

      addResourceMetaDataToResources(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('setRecordCount', () => {
    it('should set req.recordCount to req.issues.length', () => {
      const req = { issueCount: { count: 3 } }
      const res = {}
      const next = vi.fn()

      setRecordCount(req, res, next)

      expect(req.recordCount).toBe(3)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('prepareEntry', () => {
    it('should prepare entry with correct fields', () => {
      const req = {
        resources: [{ endpoint_url: 'https://example.com' }],
        issues: [
          {
            entry_number: 1,
            line_number: 2,
            field: 'Field Name',
            message: 'Error message',
            value: 'Error value'
          }
        ],
        parsedParams: { pageNumber: 1 }
      }
      const res = {}
      const next = vi.fn()

      prepareEntry(req, res, next)

      expect(req.entry).toEqual({
        title: 'entry: 1',
        fields: [
          {
            key: { text: 'Endpoint URL' },
            value: { html: '<a href=\'https://example.com\'>https://example.com</a>' },
            classes: ''
          },
          {
            key: { text: 'Row' },
            value: { html: '2' },
            classes: ''
          },
          {
            key: { text: 'Field Name' },
            value: { html: 'Error value<p class="govuk-error-message">Error message</p>' },
            classes: 'dl-summary-card-list__row--error govuk-form-group--error'
          }
        ]
      })
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('should call next with error if issue is missing', () => {
      const req = {
        resources: [{ endpoint_url: 'https://example.com' }],
        issues: [],
        parsedParams: { pageNumber: 1 }
      }
      const res = {}
      const next = vi.fn()
      prepareEntry(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('Missing required values on request object'))
    })

    it('should throw error if resources is missing', () => {
      const req = {
        issues: [
          {
            entry_number: 1,
            line_number: 2,
            field: 'Field Name',
            message: 'Error message',
            value: 'Error value'
          }
        ],
        parsedParams: { pageNumber: 1 }
      }
      const res = {}
      const next = vi.fn()

      prepareEntry(req, res, next)

      expect(next).toHaveBeenCalledWith(new Error('Missing required values on request object'))
    })
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
          issueField: 'test-issue-field',
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
