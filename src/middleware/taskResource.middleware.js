import datasette from '../services/datasette.js'
import { MiddlewareError } from '../utils/errors.js'

// Sources have already been restricted to the organisation, dataset and active endpoints.
// Validate both IDs against that list before using the resource in any data query.
export function scopeTaskResource (req, res, next) {
  if (!req.params.endpoint) return next()
  const source = req.sources.find(source => source.endpoint === req.params.endpoint &&
    source.resource && source.resource === req.params.resourceId)
  if (!source) return next(new MiddlewareError('Endpoint resource not found', 404))
  req.taskSource = source
  req.resources = [{ ...req.resources.find(resource => resource.resource === source.resource), ...source }]
  next()
}

async function allResourceRows (req, query, params = {}) {
  const rows = []
  const limit = 1000
  for (let offset = 0; ; offset += limit) {
    const { formattedData } = await datasette.runQuery(`${query} LIMIT :limit OFFSET :offset`, req.params.dataset, {
      resource: req.taskSource.resource,
      ...params,
      limit,
      offset
    })
    rows.push(...formattedData)
    if (formattedData.length < limit) return rows
  }
}

export async function fetchResourceEntities (req, res, next) {
  try {
    const facts = await allResourceRows(req, `
      SELECT f.entity, f.field, f.value, fr.entry_number
      FROM fact_resource fr JOIN fact f ON f.fact = fr.fact
      WHERE fr.resource = :resource
      ORDER BY fr.entry_number, fr.rowid`)
    const entries = new Map()
    for (const fact of facts) {
      const key = JSON.stringify([fact.entity, fact.entry_number])
      if (!entries.has(key)) entries.set(key, { entity: fact.entity, 'entry-number': fact.entry_number })
      entries.get(key)[fact.field] = fact.value
    }
    req.entities = [...entries.values()]
    next()
  } catch (error) {
    next(error)
  }
}

export async function fetchResourceIssues (req, res, next) {
  try {
    req.issues = await allResourceRows(req, `
      SELECT issue_type, field, entity, message, value, entry_number, line_number
      FROM issue
      WHERE resource = :resource AND dataset = :dataset
        AND issue_type = :issueType AND field = :field
        AND entity IS NOT NULL AND entity != ''
        AND (end_date = '' OR end_date IS NULL)
      ORDER BY entry_number, rowid`, {
      dataset: req.params.dataset,
      issueType: req.params.issue_type,
      field: req.params.issue_field
    })
    next()
  } catch (error) {
    next(error)
  }
}

export function issueMatchesEntry (issue, entry) {
  return String(issue.entity) === String(entry.entity) &&
    (entry['entry-number'] === undefined || issue.entry_number == null ||
      String(issue.entry_number) === String(entry['entry-number']))
}
