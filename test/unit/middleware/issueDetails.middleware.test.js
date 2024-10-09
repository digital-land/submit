import { describe, it, vi, expect } from 'vitest'
import * as v from 'valibot'

import performanceDbApi from '../../../src/services/performanceDbApi.js'
import { getIssueDetails, IssueDetailsQueryParams, prepareIssueDetailsTemplateParams } from '../../../src/middleware/issueDetails.middleware.js'
import mocker from '../../utils/mocker.js'
import { DatasetNameField, errorSummaryField, OrgField } from '../../../src/routes/schemas.js'

vi.mock('../../../src/services/performanceDbApi.js')

describe('issueDetails.middleware.js', () => {
  const orgInfo = { name: 'mock lpa', organisation: 'ORG' }
  const dataset = { name: 'mock dataset', dataset: 'mock-dataset', collection: 'mock-collection' }
  const entryData = [
    {
      field: 'start-date',
      value: '02-02-2022',
      entry_number: 10
    }
  ]
  const issues = [
    {
      entry_number: 10,
      field: 'start-date',
      value: '02-02-2022'
    }
  ]

  describe('prepareIssueDetailsTemplateParams', () => {
    it('should correctly set the template params', async () => {
      const requestParams = {
        lpa: 'test-lpa',
        dataset: 'test-dataset',
        issue_type: 'test-issue-type',
        issue_field: 'test-issue-field',
        resourceId: 'test-resource-id',
        pageNumber: '1'
      }
      const req = {
        params: requestParams,
        // middleware supplies the below
        entityCount: { entity_count: 3 },
        issueEntitiesCount: 1,
        orgInfo,
        dataset,
        entryData,
        issues,
        entryNumber: 10,
        resource: { resource: requestParams.resourceId },
        issuesByEntryNumber: {
          10: [
            {
              field: 'start-date',
              value: '02-02-2022',
              line_number: 1,
              entry_number: 10,
              message: 'mock message',
              issue_type: 'mock type'
            }
          ]
        },
        errorSummary: {
          heading: 'mockHeading',
          items: [
            {
              html: 'mock task message 1 in record 10',
              href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry/10'
            }
          ]
        }
      }
      v.parse(IssueDetailsQueryParams, req.params)

      issues.forEach(issue => {
        vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce(`mockMessageFor: ${issue.entry_number}`)
      })
      vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce('mock task message 1')

      prepareIssueDetailsTemplateParams(req, {}, () => {})

      const expectedTempalteParams = {
        organisation: {
          name: 'mock lpa',
          organisation: 'ORG'
        },
        dataset: {
          name: 'mock dataset',
          dataset: 'mock-dataset',
          collection: 'mock-collection'
        },
        errorSummary: req.errorSummary,
        entry: {
          title: 'entry: 10',
          fields: [
            {
              key: { text: 'start-date' },
              value: { html: '<p class="govuk-error-message">mock message</p>02-02-2022' },
              classes: 'dl-summary-card-list__row--error'
            }
          ],
          geometries: []
        },
        issueType: 'test-issue-type',
        issueField: 'test-issue-field',
        pagination: {
          items: [{
            current: true,
            href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry/1',
            number: 1,
            type: 'number'
          }]
        },
        issueEntitiesCount: 1
      }

      expect(req.templateParams).toEqual(expectedTempalteParams)
    })

    it('should correctly set the template params with the correct geometry params', async () => {
      const entryData = [
        {
          field: 'start-date',
          value: '02-02-2022',
          entry_number: 10
        },
        {
          field: 'geometry',
          value: 'POINT(0 0)',
          entry_number: 10
        }
      ]
      const requestParams = {
        lpa: 'test-lpa',
        dataset: 'test-dataset',
        issue_type: 'test-issue-type',
        issue_field: 'test-issue-field',
        resourceId: 'test-resource-id',
        pageNumber: '1'
      }
      const req = {
        params: requestParams,
        // middleware supplies the below
        entryNumber: 10,
        entityCount: { entity_count: 3 },
        issueEntitiesCount: 1,
        orgInfo,
        dataset,
        entryData,
        issues,
        resource: { resource: requestParams.resourceId },
        errorSummary: {
          heading: 'mock heading',
          items: [
            {
              html: 'mock task message 1 in record 10',
              href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry/10'
            }
          ]
        },
        issuesByEntryNumber: {
          10: [
            {
              field: 'start-date',
              message: 'mock message'
            }
          ]
        }
      }

      v.parse(IssueDetailsQueryParams, req.params)

      issues.forEach(issue => {
        vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce(`mockMessageFor: ${issue.entry_number}`)
      })
      vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce('mock task message 1')

      prepareIssueDetailsTemplateParams(req, {}, () => {})

      const expectedTemplateParams = {
        organisation: {
          name: 'mock lpa',
          organisation: 'ORG'
        },
        dataset: {
          name: 'mock dataset',
          dataset: 'mock-dataset',
          collection: 'mock-collection'
        },
        errorSummary: req.errorSummary,
        entry: {
          title: 'entry: 10',
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
            href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry/1',
            number: 1,
            type: 'number'
          }]
        },
        issueEntitiesCount: 1
      }

      expect(req.templateParams).toEqual(expectedTemplateParams)
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
