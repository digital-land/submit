import { describe, it, vi, expect } from 'vitest'
import { prepareIssueTableTemplateParams, IssueTableQueryParams, setPagePageOptions, addEntityPageNumberToEntity } from '../../../src/middleware/issueTable.middleware.js'
// import { pagination } from '../../../src/utils/pagination.js'

import mocker from '../../utils/mocker.js'
import { DatasetNameField, errorSummaryField, OrgField } from '../../../src/routes/schemas.js'

vi.mock('../../../src/services/performanceDbApi.js')
vi.mock('../../../src/utils/pagination.js', () => {
  return {
    pagination: vi.fn().mockReturnValue([
      1, '...', 4, 5
    ])
  }
})

describe('issueTable.middleware.js', () => {
  describe('addEntityPageNumberToEntity', () => {
    it('adds entityPageNumber to each entity', () => {
      const req = {
        entities: [
          { id: 1, name: 'Entity 1' },
          { id: 2, name: 'Entity 2' },
          { id: 3, name: 'Entity 3' }
        ]
      }
      const res = {}
      const next = vi.fn()

      addEntityPageNumberToEntity(req, res, next)

      expect(req.entities).toEqual([
        { id: 1, name: 'Entity 1', entityPageNumber: 1 },
        { id: 2, name: 'Entity 2', entityPageNumber: 2 },
        { id: 3, name: 'Entity 3', entityPageNumber: 3 }
      ])
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('setPagePageOptions', () => {
    it('sets request parameters for pagination', () => {
      const pageLength = 20
      const setPagePageOptionsMiddleware = setPagePageOptions(pageLength)
      const req = {
        entitiesWithIssuesCount: 50,
        params: {
          lpa: 'lpa-123',
          dataset: 'dataset-456',
          issue_type: 'issue-type',
          issue_field: 'issue-field'
        }
      }
      const res = {}
      const next = vi.fn()

      setPagePageOptionsMiddleware(req, res, next)

      expect(req.resultsCount).toBe(50)
      expect(req.urlSubPath).toBe('/organisations/lpa-123/dataset-456/issue-type/issue-field/')
      expect(req.paginationPageLength).toBe(pageLength)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('prepareIssueTableTemplateParams', () => {
    const mockedParams = mocker(IssueTableQueryParams)
    const mockedOrg = mocker(OrgField)
    const mockedDataset = mocker(DatasetNameField)
    const mockedErrorSummary = mocker(errorSummaryField)

    const req = {
      params: mockedParams,
      orgInfo: mockedOrg,
      dataset: mockedDataset,
      errorSummary: mockedErrorSummary,
      entities: [
        {
          entry_number: 10,
          'start-date': { value: 'start-date', issue: { message: 'invalid', value: 'invalid-start-date' } },
          reference: { value: 'reference' },
          entityPageNumber: 1
        }
      ],
      specification: {
        fields: [
          { field: 'start-date', type: 'date' },
          { field: 'reference', type: 'string' }
        ]
      },
      entityCountRow: { entity_count: 50 },
      issueEntitiesCount: 20,
      pagination: {
        items: [
          { number: 1, href: '/pagenation-link-1' },
          { number: 2, href: '/pagenation-link-2' }
        ]
      }
    }
    const res = {}
    const next = vi.fn()

    it('should correctly set the template params', async () => {
      prepareIssueTableTemplateParams(req, res, next)

      const tableParams = {
        columns: [
          'start-date',
          'reference'
        ],
        fields: [
          'start-date',
          'reference'
        ],
        rows: [
          {
            columns: {
              reference: {
                error: undefined,
                html: `<a href="/organisations/${req.params.lpa}/${req.params.dataset}/${req.params.issue_type}/${req.params.issue_field}/entry/${1}">${req.entities[0].reference.value}</a>`
              },
              'start-date': {
                error: {
                  message: 'invalid',
                  value: 'invalid-start-date'
                },
                value: req.entities[0]['start-date'].value
              }
            }
          }
        ]
      }

      const expectedTemplateParams = {
        organisation: req.orgInfo,
        dataset: req.dataset,
        errorSummary: req.errorSummary,
        issueType: req.params.issue_type,
        tableParams,
        pagination: req.pagination
      }

      expect(req.templateParams).toEqual(expectedTemplateParams)
    })
  })
})
