import { describe, it, vi, expect } from 'vitest'
import performanceDbApi from '../../../src/services/performanceDbApi.js'
import { prepareDatasetTaskListTemplateParams, prepareDatasetTaskListErrorTemplateParams } from '../../../src/middleware/datasetTaskList.middleware.js'

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
          }
        ],
        organisation: { name: 'Example Organisation', organisation: 'ORG' },
        dataset: { name: 'Example Dataset' }
      }

      expect(req.templateParams).toEqual(templateParams)
    })
  })

  describe('prepareDatasetTaskListErrorTemplateParams', () => {
    it('sets the correct template params on the request object', async () => {
      const resourceStatus = { status: '404', days_since_200: 3, endpoint_url: 'https://example.com', latest_log_entry_date: '2022-01-01T12:00:00.000Z' }
      const organisation = { name: 'Example Organisation', organisation: 'ORG' }
      const dataset = { name: 'Example Dataset', dataset: 'example-dataset' }
      const req = {
        params: { lpa: 'example-lpa', dataset: 'example-dataset' },
        resourceStatus,
        orgInfo: organisation,
        dataset
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      prepareDatasetTaskListErrorTemplateParams(req, res, next)

      const templateParams = req.templateParams

      const dataTimeRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z/

      expect(templateParams.organisation).toEqual(organisation)
      expect(templateParams.dataset).toEqual(dataset)
      expect(templateParams.errorData.endpoint_url).toEqual('https://example.com')
      expect(templateParams.errorData.http_status).toEqual('404')
      expect(templateParams.errorData.latest_log_entry_date).toMatch(dataTimeRegex)
      expect(templateParams.errorData.latest_200_date).toMatch(dataTimeRegex)
    })
  })
})
