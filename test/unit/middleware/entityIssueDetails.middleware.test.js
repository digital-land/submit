import { describe, it, vi, expect } from 'vitest'
import { getIssueDetails } from '../../../src/middleware/entityIssueDetails.middleware.js'

vi.mock('../../../src/services/performanceDbApi.js')

describe('issueDetails.middleware.js', () => {
  describe('prepareEntity', () => {

  })

  describe('set record count', () => {

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
