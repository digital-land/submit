// Keep endpoint selection and badge totals consistent across all dataset tabs.
export const hasEndpointError = source => !source.status || source.status < 200 || source.status >= 300

export function sourceForTask (task, sources = []) {
  if (task.endpoint) return sources.find(source => source.endpoint === task.endpoint)
  const matches = sources.filter(source => task.resource && source.resource === task.resource)
  return matches.length === 1 ? matches[0] : undefined
}

export function currentDatasetTasks ({ tasks, sources = [] }) {
  return (tasks?.tasks ?? []).filter(task => {
    if (!task.details?.issue_type || task.details.field === undefined) return false
    const source = sourceForTask(task, sources)
    // Do not display tasks from ended endpoints or superseded resources.
    if (task.endpoint && !source) return false
    // Without a collected resource, only the endpoint access task is actionable.
    if (source && !source.resource) return false
    return !source || !task.resource || task.resource === source.resource
  })
}

export function datasetTaskCount (req) {
  if (req.authority === 'some') return 1
  return currentDatasetTasks(req).length +
    (req.sources ?? []).filter(hasEndpointError).length +
    (req.expectationOutOfBounds?.length > 0 ? 1 : 0)
}

export function taskPath (params) {
  const parts = [params.lpa, params.dataset]
  if (params.endpoint && params.resourceId) {
    parts.push('endpoint', params.endpoint, 'resource', params.resourceId)
  }
  parts.push(params.issue_type, params.issue_field)
  return '/organisations/' + parts.filter(part => part !== undefined).map(encodeURIComponent).join('/')
}
