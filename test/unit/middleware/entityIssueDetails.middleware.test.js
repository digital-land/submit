import { describe, it, vi, expect, beforeEach } from 'vitest'
import { getIssueDetails, getIssueField, prepareEntity, setRecordCount, show404ifNoIssues } from '../../../src/middleware/entityIssueDetails.middleware.js'
import { MiddlewareError } from '../../../src/utils/errors.js'

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
        value: { html, originalValue: html },
        classes
      })
    })

    it('returns an object with default classes if classes are not provided', () => {
      const text = 'Issue Text'
      const html = '<p>Issue HTML</p>'
      const result = getIssueField(text, html)

      expect(result).toEqual({
        key: { text },
        value: { html, originalValue: html },
        classes: ''
      })
    })
  })

  describe('set record count', () => {
    it('sets req.recordCount to the length of req.issues', () => {
      const req = { issueEntities: [{}, {}, {}] }
      const res = {}
      const next = vi.fn()

      setRecordCount(req, res, next)

      expect(req.recordCount).toBe(3)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('sets the record count to 0 if req.issues is undefined', () => {
      const req = {}
      const res = {}
      const next = vi.fn()

      setRecordCount(req, res, next)

      expect(req.recordCount).toBe(0)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('sets the record count to 0 if req.issues is null', () => {
      const req = { issues: null }
      const res = {}
      const next = vi.fn()

      setRecordCount(req, res, next)

      expect(req.recordCount).toBe(0)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('prepareEntity', () => {
    const req = {}
    const res = {}

    beforeEach(() => {
      req.issueEntities = [
        { entity: 'entity1', name: 'Entity 1', field1: 'value1', field2: 'value2', geometry: 'POINT (-0.10 51.49)' },
        { entity: 'entity2', name: 'Entity 2', field1: 'value3', field2: 'value4', geometry: undefined }
      ]
      req.issues = [
        { entity: 'entity1', field: 'field1', message: 'Error 1' },
        { entity: 'entity1', field: 'field2', message: 'Error 2' },
        { entity: 'entity2', field: 'field1', message: 'Error 3' }
      ]
      req.specification = {
        fields: [
          { field: 'field1', datasetField: 'datasetField1' },
          { field: 'field2', datasetField: 'datasetField2' },
          { field: 'geometry', datasetField: 'geometry_field' }
        ]
      }
      req.parsedParams = { pageNumber: 1, issue_type: 'issueType' }
    })

    it('should set req.entry with correct title and fields', () => {
      prepareEntity(req, res, () => {})
      expect(req.entry).toEqual({
        title: 'Entity 1',
        fields: [
          {
            key: { text: 'field1' },
            value: {
              html: '<p class="govuk-error-message">Error 1</p>value1',
              originalValue: 'value1'
            },
            classes: 'dl-summary-card-list__row--error govuk-form-group--error'
          },
          {
            key: { text: 'field2' },
            value: {
              html: '<p class="govuk-error-message">Error 2</p>value2',
              originalValue: 'value2'
            },
            classes: 'dl-summary-card-list__row--error govuk-form-group--error'
          },
          {
            key: { text: 'geometry' },
            classes: '',
            value: {
              html: req.issueEntities[0].geometry,
              originalValue: req.issueEntities[0].geometry
            }
          }
        ],
        geometries: [{
          type: 'geometry',
          geo: req.issueEntities[0].geometry,
          reference: undefined
        }]
      })
    })

    it('should add error classes to fields with issues', () => {
      prepareEntity(req, res, () => {})
      expect(req.entry.fields[0].classes).toContain('dl-summary-card-list__row--error')
      expect(req.entry.fields[1].classes).toContain('dl-summary-card-list__row--error')
    })

    it('should add new fields for issues without matching specification fields', () => {
      req.issues.push({ entity: 'entity1', field: 'newField', message: 'New Error' })
      prepareEntity(req, res, () => {})
      expect(req.entry.fields).toHaveLength(4)
      expect(req.entry.fields[3].key.text).toBe('newField')
      expect(req.entry.fields[3].value.html).toBe('<p class="govuk-error-message">New Error</p>')
      expect(req.entry.fields[3].classes).toContain('dl-summary-card-list__row--error')
    })

    it('should handle no issues or specification fields', () => {
      req.issues = []
      req.specification = { fields: [] }
      prepareEntity(req, res, () => {})
      expect(req.entry).toEqual({
        title: 'Entity 1',
        fields: [],
        geometries: []
      })
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
            totalRows: 150,
            maxPageNumber: 3,
            pageLength: 50,
            offset: 0
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

  describe('show404ifNoIssues', () => {
    it('raises 404 when on issues found', () => {
      let next = vi.fn()
      show404ifNoIssues({ recordCount: 0 }, {}, next)
      expect(next).toHaveBeenCalledWith(new MiddlewareError('no issues found', 404))

      next = vi.fn()
      show404ifNoIssues({ recordCount: 10 }, {}, next)
      expect(next).toHaveBeenCalledWith()
    })
  })
})
