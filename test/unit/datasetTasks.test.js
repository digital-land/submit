import { describe, it, expect } from 'vitest'
import { currentDatasetTasks, datasetTaskCount, sourceForTask } from '../../src/utils/datasetTasks.js'

const sources = [
  { endpoint: 'a', resource: 'new', status: 200 },
  { endpoint: 'b', resource: 'shared', status: 200 },
  { endpoint: 'c', resource: 'shared', status: 200 },
  { endpoint: 'broken', status: 403 }
]
const issue = (endpoint, resource) => ({ endpoint, resource, details: { issue_type: 'missing value', field: 'name', count: 2 } })

describe('dataset tasks', () => {
  it('keeps current endpoint tasks, excluding ended endpoints and old resources', () => {
    const tasks = { tasks: [issue('a', 'old'), issue('a', 'new'), issue('b', 'shared'), issue('c', 'shared'), issue('ended', 'old')] }
    expect(currentDatasetTasks({ tasks, sources })).toEqual(tasks.tasks.slice(1, 4))
    expect(datasetTaskCount({ tasks, sources })).toBe(4)
    expect(datasetTaskCount({ tasks, sources, expectationOutOfBounds: [{}] })).toBe(5)
    expect(datasetTaskCount({ tasks, sources, authority: 'some' })).toBe(1)
  })

  it('does not attribute a shared resource to an arbitrary endpoint', () => {
    expect(sourceForTask(issue(undefined, 'shared'), sources)).toBeUndefined()
    expect(sourceForTask(issue(undefined, 'new'), sources)).toBe(sources[0])
  })

  it('does not link an endpoint without a resource to combined dataset issues', () => {
    const tasks = { tasks: [issue('broken', undefined)] }
    expect(currentDatasetTasks({ tasks, sources })).toEqual([])
    expect(datasetTaskCount({ tasks, sources })).toBe(1)
  })
})
