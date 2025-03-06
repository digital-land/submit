import * as v from 'valibot'
import * as S from '../../../src/routes/schemas.js'
import { describe, it, vi, expect } from 'vitest'
import { prepareDatasetTaskListTemplateParams, prepareTasks } from '../../../src/middleware/datasetTaskList.middleware.js'
import performanceDbApi from '../../../src/services/performanceDbApi.js'

vi.mock('../../../src/services/performanceDbApi.js')

describe('datasetTaskList.middleware.js', () => {
  describe('prepareDatasetTaskListTemplateParams', () => {
    it('sets the correct template params on the request object', async () => {
      const req = {
        orgInfo: { name: 'Example Organisation', organisation: 'ORG' },
        dataset: { name: 'Example Dataset', collection: 'collection 1' },
        taskList: [
          {
            title: { text: 'task message goes here' },
            href: '/foo/bar',
            status: { tag: { classes: 'some-class', text: 'Needs fixing' } }
          }]
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      prepareDatasetTaskListTemplateParams(req, res, next)
      v.parse(S.OrgDatasetTaskList, req.templateParams)

      const templateParams = {
        taskList: req.taskList,
        organisation: { name: 'Example Organisation', organisation: 'ORG' },
        dataset: { name: 'Example Dataset', collection: 'collection 1' }
      }
      v.parse(S.OrgDatasetTaskList, templateParams)

      expect(req.templateParams).toEqual(templateParams)
    })
  })

  describe('prepareTasks', () => {
    it('prepares the task list with issues', async () => {
      const req = {
        parsedParams: {
          lpa: 'some-lpa',
          dataset: 'some-dataset'
        },
        sources: [],
        entities: ['entity1', 'entity2'],
        resources: [{ entry_count: 10 }],
        entryIssueCounts: [{ field: 'field1', issue_type: 'issue-type1', count: 1 }],
        entityIssueCounts: [{ field: 'field2', issue_type: 'issue-type2', count: 1 }]
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
        sources: [],
        entities: [],
        resources: [{ entry_count: 10 }],
        entryIssueCounts: [{ field: 'field1', issue_type: 'reference values are not unique', count: 1 }],
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
          href: encodeURI('/organisations/some-lpa/some-dataset/reference values are not unique/field1'),
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

    it('handles empty issue counts gracefully', async () => {
      const req = {
        parsedParams: {
          lpa: 'some-lpa',
          dataset: 'some-dataset'
        },
        sources: [],
        entities: ['entity1'],
        resources: [{ entry_count: 10 }],
        entryIssueCounts: [],
        entityIssueCounts: []
      }

      const res = { status: vi.fn() }
      const next = vi.fn()

      prepareTasks(req, res, next)

      expect(req.taskList).toEqual([]) // No tasks should be created

      expect(next).toHaveBeenCalledTimes(1)
    })

    it('handles errors from performanceDbApi gracefully', async () => {
      // Simulating error in performanceDbApi.getTaskMessage
      vi.spyOn(performanceDbApi, 'getTaskMessage').mockImplementation(() => {
        throw new Error('Error generating task message')
      })

      const req = {
        parsedParams: {
          lpa: 'some-lpa',
          dataset: 'some-dataset'
        },
        entities: ['entity1'],
        sources: [],
        resources: [{ entry_count: 10 }],
        entryIssueCounts: [{ field: 'field1', issue_type: 'issue-type1', count: 1 }],
        entityIssueCounts: []
      }

      const res = { status: vi.fn() }
      const next = vi.fn()

      prepareTasks(req, res, next)

      expect(req.taskList).toEqual([
        {
          title: { text: '1 issue of type issue-type1' }, // Or some default text if error is handled that way
          href: '/organisations/some-lpa/some-dataset/issue-type1/field1',
          status: { tag: { classes: 'govuk-tag--yellow', text: 'Needs fixing' } }
        }
      ])

      expect(next).toHaveBeenCalledTimes(1)
    })

    it('handles invalid issue types', async () => {
      const req = {
        parsedParams: {
          lpa: 'some-lpa',
          dataset: 'some-dataset'
        },
        entities: ['entity1'],
        sources: [],
        resources: [{ entry_count: 10 }],
        entryIssueCounts: [{ field: 'field1', issue_type: '', count: 1 }], // Invalid issue type (empty string)
        entityIssueCounts: []
      }

      const res = { status: vi.fn() }
      const next = vi.fn()

      prepareTasks(req, res, next)

      expect(req.taskList).toEqual([])

      expect(next).toHaveBeenCalledTimes(1)
    })

    it('handles missing field param in issues', async () => {
      const req = {
        parsedParams: {
          lpa: 'some-lpa',
          dataset: 'some-dataset'
        },
        entities: ['entity1'],
        resources: [{ entry_count: 10 }],
        sources: [],
        entryIssueCounts: [{ issue_type: 'issue-type1', count: 1 }], // Missing field
        entityIssueCounts: []
      }

      const res = { status: vi.fn() }
      const next = vi.fn()

      prepareTasks(req, res, next)

      expect(req.taskList).toEqual([]) // No task created due to missing field

      expect(next).toHaveBeenCalledTimes(1)
    })

    it('adds tasks for failed "out of bounds" expectations', async () => {
      const req = {
        parsedParams: {
          lpa: 'some-lpa',
          dataset: 'some-dataset'
        },
        entities: ['entity1'],
        resources: [{ entry_count: 10 }],
        sources: [],
        entryIssueCounts: [{ issue_type: 'issue-type1', count: 1 }], // Missing field
        entityIssueCounts: [],
        expectationOutOfBounds: [
          { dataset: 'some-dataset', passed: 'False', details: { actual: 3, expected: 0 } }
        ]
      }

      const res = { status: vi.fn() }
      const next = vi.fn()

      prepareTasks(req, res, next)

      expect(req.taskList.length).toBe(1)
      const { href, status: { tag: { text } } } = req.taskList[0]
      expect(href).toBe('')
      expect(text).toBe('Needs fixing')

      expect(next).toHaveBeenCalledTimes(1)
    })
  })
})
