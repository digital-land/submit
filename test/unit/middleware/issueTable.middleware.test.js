import { describe, it, vi, expect } from 'vitest'
import { prepareIssueTableTemplateParams, IssueTableQueryParams, setDefaultQueryParams, createPaginationTemplatePrams } from '../../../src/middleware/issueTable.middleware.js'
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
  describe('setDefaultQueryParams', () => {
    it('sets the page number when none is set', () => {
      const req = {
        params: {}
      }
      const next = vi.fn()

      setDefaultQueryParams(req, {}, next)

      expect(req.params.pageNumber).toEqual(1)
      expect(next).toHaveBeenCalledOnce()
    })

    it('sets does not change the page number when one is set', () => {
      const req = {
        params: {
          pageNumber: 2
        }
      }
      const next = vi.fn()

      setDefaultQueryParams(req, {}, next)
      expect(req.params.pageNumber).toEqual(2)
      expect(next).toHaveBeenCalledOnce()
    })
  })

  describe('createPaginationTemplatePrams', () => {
    it('should correctly set next when there is more than one page', () => {
      const req = {
        params: { pageNumber: 1, lpa: 'lpa', dataset: 'datasetId', issue_type: 'issueType', issue_field: 'issueField' },
        issueEntitiesCount: 60
      }
      const res = {}
      const next = vi.fn()

      const BaseSubpath = `/organisations/${req.params.lpa}/${req.params.dataset}/${req.params.issue_type}/${req.params.issue_field}/`

      createPaginationTemplatePrams(req, res, next)

      expect(req.pagination.previous).not.toBeDefined()
      expect(req.pagination.next).toBeDefined()
      expect(req.pagination.next).toEqual({
        href: `${BaseSubpath}${2}`
      })
    })

    it('should correct set previous when the current pageNumber is greater than 1', () => {
      const req = {
        params: { pageNumber: 2, lpa: 'lpa', dataset: 'datasetId', issue_type: 'issueType', issue_field: 'issueField' },
        issueEntitiesCount: 60
      }
      const res = {}
      const next = vi.fn()

      const BaseSubpath = `/organisations/${req.params.lpa}/${req.params.dataset}/${req.params.issue_type}/${req.params.issue_field}/`

      createPaginationTemplatePrams(req, res, next)

      expect(req.pagination.next).not.toBeDefined()
      expect(req.pagination.previous).toBeDefined()
      expect(req.pagination.previous).toEqual({
        href: `${BaseSubpath}${1}`
      })
    })

    it('should correctly set the items', () => {
      const req = {
        params: { pageNumber: 4, lpa: 'lpa', dataset: 'datasetId', issue_type: 'issueType', issue_field: 'issueField' },
        issueEntitiesCount: 60
      }
      const res = {}
      const next = vi.fn()

      const BaseSubpath = `/organisations/${req.params.lpa}/${req.params.dataset}/${req.params.issue_type}/${req.params.issue_field}/`

      createPaginationTemplatePrams(req, res, next)

      expect(req.pagination.items).toEqual([
        {
          current: false,
          href: `${BaseSubpath}1`,
          number: 1,
          type: 'number'
        },
        {
          ellipsis: true,
          href: '#',
          type: 'ellipsis'
        },
        {
          current: true,
          href: `${BaseSubpath}4`,
          number: 4,
          type: 'number'
        },
        {
          current: false,
          href: `${BaseSubpath}5`,
          number: 5,
          type: 'number'
        }
      ])
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
      entitiesWithIssues: [
        {
          entry_number: 10,
          'start-date': 'start-date',
          reference: 'reference',
          issues: '{"start-date": "invalid"}'
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
                html: `<a href="/organisations/${req.params.lpa}/${req.params.dataset}/${req.params.issue_type}/${req.params.issue_field}/entry/${1}">${req.entitiesWithIssues[0].reference}</a>`
              },
              'start-date': {
                value: req.entitiesWithIssues[0]['start-date'],
                error: {
                  message: 'invalid'
                }
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
