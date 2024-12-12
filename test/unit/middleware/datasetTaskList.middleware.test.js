import { describe, it, vi, expect } from 'vitest'
import { prepareDatasetTaskListTemplateParams, prepareDatasetTaskListErrorTemplateParams, prepareTasks } from '../../../src/middleware/datasetTaskList.middleware.js'
import performanceDbApi from '../../../src/services/performanceDbApi.js'

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

  describe('prepareTasks', () => {
    it('prepares the task list with issues', async () => {
      const req = {
        parsedParams: {
          lpa: 'some-lpa',
          dataset: 'some-dataset'
        },
        entities: ['entity1', 'entity2'],
        resources: [{ entry_count: 10 }],
        entryIssueCounts: [{ field: 'field1', issue_type: 'issue-type1' }],
        entityIssueCounts: [{ field: 'field2', issue_type: 'issue-type2' }]
      }

      const res = {
        status: vi.fn()
      }

      const next = vi.fn()

      prepareTasks(req, res, next)

      expect(performanceDbApi.getTaskMessage).toHaveBeenCalledWith({
        issue_type: 'issue-type1',
        num_issues: 1,
        rowCount: 2,
        field: 'field1'
      })

      expect(performanceDbApi.getTaskMessage).toHaveBeenCalledWith({
        issue_type: 'issue-type2',
        num_issues: 1,
        rowCount: 2,
        field: 'field2'
      })

      expect(req.taskList).toEqual([
        {
          title: {
            text: undefined
          },
          href: '/organisations/some-lpa/some-dataset/issue-type1/field1',
          status: {
            tag: {
              classes: 'govuk-tag--yellow',
              text: 'Needs fixing'
            }
          }
        },
        {
          title: {
            text: undefined
          },
          href: '/organisations/some-lpa/some-dataset/issue-type2/field2',
          status: {
            tag: {
              classes: 'govuk-tag--yellow',
              text: 'Needs fixing'
            }
          }
        }
      ])

      expect(next).toHaveBeenCalledTimes(1)
    })

    it('uses resource row count for special issue types', async () => {
      const req = {
        parsedParams: {
          lpa: 'some-lpa',
          dataset: 'some-dataset'
        },
        entities: [],
        resources: [{ entry_count: 10 }],
        entryIssueCounts: [{ field: 'field1', issue_type: 'reference values are not unique' }],
        entityIssueCounts: []
      }

      const res = {
        status: vi.fn()
      }

      const next = vi.fn()

      prepareTasks(req, res, next)

      expect(performanceDbApi.getTaskMessage).toHaveBeenCalledWith({
        issue_type: 'reference values are not unique',
        num_issues: 1,
        rowCount: 10,
        field: 'field1'
      })

      expect(req.taskList).toEqual([
        {
          title: {
            text: undefined
          },
          href: '/organisations/some-lpa/some-dataset/reference values are not unique/field1',
          status: {
            tag: {
              classes: 'govuk-tag--yellow',
              text: 'Needs fixing'
            }
          }
        }
      ])

      expect(next).toHaveBeenCalledTimes(1)
    })
  })
})
