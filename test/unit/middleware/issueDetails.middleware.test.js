import { describe, it, vi, expect } from 'vitest'
import * as v from 'valibot'

import performanceDbApi from '../../../src/services/performanceDbApi.js'
import { getIssueDetails, IssueDetailsQueryParams, prepareIssueDetailsTemplateParams } from '../../../src/middleware/issueDetails.middleware.js'

vi.mock('../../../src/services/performanceDbApi.js')

describe('issueDetails.middleware.js', () => {
  const orgInfo = { name: 'mock lpa', organisation: 'ORG' }
  const dataset = { name: 'mock dataset', dataset: 'mock-dataset', collection: 'mock-collection' }
  const entryData = [
    {
      field: 'start-date',
      value: '02-02-2022',
      entry_number: 1
    }
  ]
  const issues = [
    {
      entry_number: 0,
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
        entityNumber: '1'
      }
      const req = {
        params: requestParams,
        parsedParams: { pageNumber: 1 },
        // middleware supplies the below
        entryNumber: 1,
        entityCount: { entity_count: 1 },
        issueEntitiesCount: { count: 1 },
        pageNumber: 1,
        pagination: {
          items: [
            {
              current: true,
              href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry/1',
              number: 1,
              type: 'number'
            }
          ]
        },
        baseSubpath: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry',
        orgInfo,
        dataset,
        entryData,
        issues,
        resource: { resource: requestParams.resourceId },
        entryNumberCount: 1,
        issuesByEntryNumber: {
          1: [
            {
              field: 'start-date',
              value: '02-02-2022',
              line_number: 1,
              entry_number: 1,
              message: 'mock message',
              issue_type: 'mock type'
            }
          ]
        }
        // errorHeading -- set  in prepare* fn
      }
      v.parse(IssueDetailsQueryParams, req.params)

      issues.forEach(issue => {
        vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce(`mockMessageFor: ${issue.entry_number}`)
      })

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
        errorSummary: {
          heading: undefined,
          items: [
            {
              html: 'mockMessageFor: 0'
            }
          ]
        },
        entry: {
          title: 'entry: 1',
          fields: [
            {
              key: { text: 'start-date' },
              value: {
                html: '<p class="govuk-error-message">mock message</p>02-02-2022'
              },
              classes: 'dl-summary-card-list__row--error govuk-form-group--error'
            }
          ],
          geometries: []
        },
        issueType: 'test-issue-type',
        pagination: {
          items: [{
            current: true,
            href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry/1',
            number: 1,
            type: 'number'
          }]
        },
        issueEntitiesCount: 1,
        pageNumber: 1
      }

      expect(req.templateParams).toEqual(expectedTempalteParams)
    })

    it('should correctly set the template params with the correct geometry params', async () => {
      const entryData = [
        {
          field: 'start-date',
          value: '02-02-2022',
          entry_number: 1
        },
        {
          field: 'geometry',
          value: 'POINT(0 0)',
          entry_number: 1
        }
      ]
      const requestParams = {
        lpa: 'test-lpa',
        dataset: 'test-dataset',
        issue_type: 'test-issue-type',
        issue_field: 'test-issue-field',
        resourceId: 'test-resource-id',
        entityNumber: '1'
      }
      const req = {
        params: requestParams,
        parsedParams: { pageNumber: 1 },
        pagination: {
          items: [
            {
              current: true,
              href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry/1',
              number: 1,
              type: 'number'
            }
          ]
        },
        baseSubpath: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry',
        entryNumber: 1,
        entityCount: { entity_count: 3 },
        issueEntitiesCount: { count: 1 },
        pageNumber: 1,
        orgInfo,
        dataset,
        entryData,
        issues,
        resource: { resource: requestParams.resourceId },
        entryNumberCount: 1,
        issuesByEntryNumber: {
          1: [
            {
              field: 'start-date',
              value: '02-02-2022',
              line_number: 1,
              entry_number: 1,
              message: 'mock message',
              issue_type: 'mock type'
            }
          ]
        }
        // errorHeading -- set  in prepare* fn
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
        errorSummary: {
          heading: 'mockMessageFor: 0',
          items: [
            {
              html: 'mock task message 1 in record 1',
              href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry/1'
            }
          ]
        },
        entry: {
          title: 'entry: 1',
          fields: [
            {
              key: { text: 'start-date' },
              value: {
                html: '<p class="govuk-error-message">mock message</p>02-02-2022'
              },
              classes: 'dl-summary-card-list__row--error govuk-form-group--error'
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
            href: '/organisations/test-lpa/test-dataset/test-issue-type/test-issue-field/entry/1',
            number: 1,
            type: 'number'
          }]
        },
        issueEntitiesCount: 1,
        pageNumber: 1
      }

      expect(req.templateParams).toEqual(expectedTemplateParams)
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
                value: { html: '02-02-2022<p class="govuk-error-message">mock message</p>' },
                classes: 'dl-summary-card-list__row--error govuk-form-group--error'
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
