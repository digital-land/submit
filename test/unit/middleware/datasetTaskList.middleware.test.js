import { describe, it, vi, expect } from 'vitest'
import { prepareDatasetTaskListTemplateParams, prepareDatasetTaskListErrorTemplateParams } from '../../../src/middleware/datasetTaskList.middleware.js'

vi.mock('../../../src/services/performanceDbApi.js')

describe('datasetTaskList.middleware.js', () => {
  describe('prepareDatasetTaskListParams', () => {
    it('sets the correct template params on the request object', async () => {
      const req = {
        orgInfo: { name: 'Example Organisation', organisation: 'ORG' },
        dataset: { name: 'Example Dataset' },
        taskList: 'taskList'
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      prepareDatasetTaskListTemplateParams(req, res, next)

      const templateParams = {
        taskList: 'taskList',
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
