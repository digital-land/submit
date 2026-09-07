import { describe, it, expect, vi } from 'vitest'
import { prepareTask } from '../../src/controllers/issueDetailsController'
import { updateSessionFromRequestData } from '../../src/controllers/resultsController.js'

describe('issueDetailsController', () => {
  const reqTemplate = {
    locals: {},
    aggregatedTasks: new Map([
      ['missing column|name', { field: 'name' }]]),
    params: { issueType: 'missing column', field: 'name' },
    totalRows: 10
  }

  it('missing columns issue produces useful message', () => {
    const req = structuredClone(reqTemplate)
    const next = vi.fn()
    prepareTask(req, {}, next)
    expect(req.locals.task.message).toBe('<span class="column-name">name</span> column is missing')
  })

  it('produces useful message for field issues', () => {
    const req = structuredClone(reqTemplate)
    req.params = { issueType: 'invalid flag', field: 'some flag' }
    req.aggregatedTasks.set(`${req.params.issueType}|${req.params.field}`, {
      ...req.params, count: 2
    })
    const next = vi.fn()
    prepareTask(req, {}, next)
    expect(req.locals.task.message.trim()).toBe('2 entries in the <span class="column-name">some flag</span> field which must be \'yes\', \'no\', or blank')
  })

  it('restores check context from the request data', () => {
    const values = new Map()
    const req = {
      locals: {
        requestData: {
          getParams: () => ({
            organisationName: 'local-authority:ABC',
            dataset: 'local-plan',
            collection: 'local-plan',
            type: 'check_file'
          })
        }
      },
      params: { id: 'request-id' },
      sessionModel: { set: (key, value) => values.set(key, value) }
    }

    updateSessionFromRequestData(req, {}, vi.fn())

    expect(Object.fromEntries(values)).toMatchObject({
      request_id: 'request-id',
      orgId: 'local-authority:ABC',
      lpa: 'local-authority:ABC',
      dataset: 'local-plan',
      'data-subject': 'local-plan'
    })
  })
})
