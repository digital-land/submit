import { describe, it, expect, vi } from 'vitest'
import { prepareTask } from '../../src/controllers/issueDetailsController'

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
    expect(req.locals.task.message.trim()).toBe('2 entries have <span class="column-name">some flag</span> fields that must have valid YES or NO values')
  })
})
