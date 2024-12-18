import { describe, it, vi, expect } from 'vitest'
import performanceDbApi from '../../../src/services/performanceDbApi.js'
import { prepareDatasetTaskListTemplateParams } from '../../../src/middleware/datasetTaskList.middleware.js'

vi.mock('../../../src/services/performanceDbApi.js')

describe('datasetTaskList.middleware.js', () => {
  describe('prepareDatasetTaskListParams', () => {
    it('sets the correct template params on the request object', async () => {
      const req = {
        params: { lpa: 'example-lpa', dataset: 'example-dataset' },
        resourceStatus: {
          resource: 'mock-resource',
          endpoint_url: 'http://example.com/resource',
          status: '200',
          latest_log_entry_date: '',
          days_since_200: 0
        },
        orgInfo: { name: 'Example Organisation', organisation: 'ORG' },
        dataset: { name: 'Example Dataset' },
        resource: { resource: 'mock-resource' },
        sources: [
          {
            name: 'endpoint 1',
            endpoint: 'FOO',
            endpoint_url: 'http://endpoint1.co.uk',
            documentation_url: 'http://endpoint1-docs.co.uk',
            lastAccessed: '2024-09-09',
            lastUpdated: '2024-09-09'
          }],
        issues: [
          {
            issue: 'Example issue 1',
            issue_type: 'Example issue type 1',
            field: 'Example issue field 1',
            num_issues: 1,
            status: 'Error'
          },
          {
            issue: 'Example issue 2',
            issue_type: 'Example issue type 2',
            field: 'Example issue field 2',
            num_issues: 1,
            status: 'Needs fixing'
          }
        ]
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      vi.mocked(performanceDbApi.getTaskMessage).mockReturnValueOnce('task message 1').mockReturnValueOnce('task message 2')

      prepareDatasetTaskListTemplateParams(req, res, next)

      const templateParams = {
        taskList: [
          {
            title: {
              text: 'task message 1'
            },
            href: '/organisations/example-lpa/example-dataset/Example issue type 1/Example issue field 1',
            status: {
              tag: {
                classes: 'govuk-tag--red',
                text: 'Error'
              }
            }
          },
          {
            title: {
              text: 'task message 2'
            },
            href: '/organisations/example-lpa/example-dataset/Example issue type 2/Example issue field 2',
            status: {
              tag: {
                classes: 'govuk-tag--yellow',
                text: 'Needs fixing'
              }
            }
          },
          {
            href: '/organisations/example-lpa/example-dataset/endpoint-error/FOO',
            status: {
              tag: {
                classes: 'govuk-tag--red',
                text: 'Error'
              }
            },
            title: {
              text: 'There was an error accessing the URL'
            }
          }
        ],
        organisation: { name: 'Example Organisation', organisation: 'ORG' },
        dataset: { name: 'Example Dataset' }
      }

      expect(req.templateParams).toEqual(templateParams)
    })
  })
})
