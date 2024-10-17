import { describe, it, vi, expect, beforeEach } from 'vitest'

import { getIssueDetails, getIssueField, issueErrorMessageHtml, prepareIssueDetailsTemplateParams } from '../../../src/middleware/issueDetails.middleware.js'
import mocker from '../../utils/mocker.js'
import { DatasetNameField, errorSummaryField, OrgField } from '../../../src/routes/schemas.js'

vi.mock('../../../src/services/performanceDbApi.js')

describe('issueDetails.middleware.js', () => {
  describe('issueErrorMessageHtml', () => {
    it('should return an HTML string with the error message and issue value', () => {
      const errorMessage = 'Mock error message'
      const issue = { value: '02-02-2022' }
      const result = issueErrorMessageHtml(errorMessage, issue)
      expect(result).toBe(`<p class="govuk-error-message">${errorMessage}</p>02-02-2022`)
    })

    it('should return an HTML string with only the error message if issue is null', () => {
      const errorMessage = 'Mock error message'
      const result = issueErrorMessageHtml(errorMessage, null)
      expect(result).toBe(`<p class="govuk-error-message">${errorMessage}</p>`)
    })

    it('should return an HTML string with only the error message if issue.value is null', () => {
      const errorMessage = 'Mock error message'
      const issue = { value: null }
      const result = issueErrorMessageHtml(errorMessage, issue)
      expect(result).toBe(`<p class="govuk-error-message">${errorMessage}</p>`)
    })
  })

  describe('getIssueField', () => {
    it('should return an object with key, value, and classes properties', () => {
      const text = 'Mock text'
      const html = '<p>Mock html</p>'
      const classes = 'mock-classes'
      const result = getIssueField(text, html, classes)
      expect(result).toEqual({
        key: { text },
        value: { html },
        classes
      })
    })

    it('should return an object with default classes if classes is not provided', () => {
      const text = 'Mock text'
      const html = '<p>Mock html</p>'
      const result = getIssueField(text, html)
      expect(result).toEqual({
        key: { text },
        value: { html },
        classes: ''
      })
    })
  })

  describe('prepareIssueDetailsTemplateParams', () => {
    const req = {
      entities: [
        { reference: { value: 'entry-1' }, geometry: { value: 'geom-1' }, field1: { value: 'val-1', issue: { message: 'error' } } },
        { reference: { value: 'entry-2' }, geometry: { value: 'geom-2' }, field2: { value: 'val-2' } }
      ],
      issueEntitiesCount: 2,
      errorSummary: 'Mock error summary',
      specification: {
        fields: [
          { field: 'reference', datasetField: 'reference', label: 'Reference' },
          { field: 'geometry', datasetField: 'geometry', label: 'Geometry' },
          { field: 'field1', datasetField: 'field1', label: 'Field 1' },
          { field: 'field2', datasetField: 'field2', label: 'Field 2' },
          { field: 'field3', datasetField: 'field3', label: 'Field 3' }
        ]
      },
      params: {
        lpa: 'lpa-1',
        dataset: 'dataset-1',
        issue_type: 'issue-type-1',
        issue_field: 'issue-field-1',
        pageNumber: '1'
      },
      orgInfo: { name: 'Org Name' },
      dataset: { name: 'Dataset Name' },
      pagination: 'paginationObject'
    }

    const res = {}
    const next = vi.fn()

    beforeEach(() => {
      req.templateParams = {}
    })

    it('should set templateParams on the request object', () => {
      prepareIssueDetailsTemplateParams(req, res, next)
      expect(req.templateParams).toBeDefined()
    })

    it('should set organisation, dataset, and errorSummary on templateParams', () => {
      prepareIssueDetailsTemplateParams(req, res, next)
      expect(req.templateParams.organisation).toEqual(req.orgInfo)
      expect(req.templateParams.dataset).toEqual(req.dataset)
      expect(req.templateParams.errorSummary).toBe(req.errorSummary)
    })

    it('should set entry on templateParams with correct fields', () => {
      prepareIssueDetailsTemplateParams(req, res, next)
      expect(req.templateParams.entry).toBeDefined()
      expect(req.templateParams.entry.title).toBe('entry: entry-1')
      expect(req.templateParams.entry.fields).toHaveLength(5)
      expect(req.templateParams.entry.geometries).toEqual('geom-1')
      expect(req.templateParams.entry.fields[0].key.text).toBe('reference')
      expect(req.templateParams.entry.fields[0].value.html).toBe('entry-1')
      expect(req.templateParams.entry.fields[0].classes).toBe('')
      expect(req.templateParams.entry.fields[1].key.text).toBe('geometry')
      expect(req.templateParams.entry.fields[1].value.html).toBe('geom-1')
      expect(req.templateParams.entry.fields[1].classes).toBe('')
      expect(req.templateParams.entry.fields[2].key.text).toBe('field1')
      expect(req.templateParams.entry.fields[2].value.html).toBe('<p class="govuk-error-message">error</p>val-1')
      expect(req.templateParams.entry.fields[2].classes).toBe('dl-summary-card-list__row--error')
      expect(req.templateParams.entry.fields[3].key.text).toBe('field2')
      expect(req.templateParams.entry.fields[3].value.html).toBe('')
      expect(req.templateParams.entry.fields[3].classes).toBe('')
      expect(req.templateParams.entry.fields[4].key.text).toBe('field3')
      expect(req.templateParams.entry.fields[4].value.html).toBe('')
      expect(req.templateParams.entry.fields[4].classes).toBe('')
    })

    it('should set pagination on templateParams with correct items', () => {
      prepareIssueDetailsTemplateParams(req, res, next)
      expect(req.templateParams.pagination).toEqual('paginationObject')
    })

    it('should call next function', () => {
      const nextSpy = vi.fn()
      prepareIssueDetailsTemplateParams(req, res, nextSpy)
      expect(nextSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('getIssueDetails', () => {
    it('should call render using the provided template params and correct view', () => {
      const mockedOrg = mocker(OrgField)
      const mockedDataset = mocker(DatasetNameField)
      const mockErrorSummary = mocker(errorSummaryField)

      const req = {
        templateParams: {
          organisation: mockedOrg,
          dataset: mockedDataset,
          errorSummary: mockErrorSummary,
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
            geometries: 'POINT(0 0)'
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
          issueEntitiesCount: 1,
          pageNumber: 1
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
