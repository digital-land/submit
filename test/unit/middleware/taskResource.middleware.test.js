import { beforeEach, describe, expect, it, vi } from 'vitest'
import datasette from '../../../src/services/datasette.js'
import { fetchResourceEntities, fetchResourceIssues, issueMatchesEntry, scopeTaskResource } from '../../../src/middleware/taskResource.middleware.js'

vi.mock('../../../src/services/datasette.js', () => ({ default: { runQuery: vi.fn() } }))

const request = () => ({
  params: { endpoint: 'a', resourceId: 'latest', dataset: 'tree', issue_type: 'missing value', issue_field: 'name' },
  sources: [{ endpoint: 'a', resource: 'latest', endpoint_url: 'https://example.com/a.csv' }],
  resources: [{ resource: 'other' }, { resource: 'latest', entry_count: 10 }]
})

describe('endpoint task resources', () => {
  beforeEach(() => vi.resetAllMocks())

  it('leaves existing unscoped links working', () => {
    const req = { params: {} }
    const next = vi.fn()
    scopeTaskResource(req, {}, next)
    expect(next).toHaveBeenCalledWith()
    expect(req.resources).toBeUndefined()
  })

  it('reconstructs resource entries without merging duplicate entities on different rows', async () => {
    const req = request()
    scopeTaskResource(req, {}, vi.fn())
    datasette.runQuery.mockResolvedValueOnce({
      formattedData: [
        { entity: 1, entry_number: 1, field: 'reference', value: 'R1' },
        { entity: 1, entry_number: 1, field: 'name', value: 'Endpoint A value' },
        { entity: 1, entry_number: 2, field: 'reference', value: 'R1 duplicate' }
      ]
    })
    const next = vi.fn()
    await fetchResourceEntities(req, {}, next)
    expect(next).toHaveBeenCalledWith()
    expect(req.entities).toEqual([
      { entity: 1, 'entry-number': 1, reference: 'R1', name: 'Endpoint A value' },
      { entity: 1, 'entry-number': 2, reference: 'R1 duplicate' }
    ])
    expect(datasette.runQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE fr.resource = :resource'), 'tree', { resource: 'latest', limit: 1000, offset: 0 })
    expect(datasette.runQuery.mock.calls[0][0]).not.toContain('FROM entity')
  })

  it('loads all resource facts beyond the Datasette page limit', async () => {
    const req = request()
    scopeTaskResource(req, {}, vi.fn())
    datasette.runQuery.mockResolvedValueOnce({ formattedData: Array.from({ length: 1000 }, (_, i) => ({ entity: i, entry_number: i, field: 'name', value: `row ${i}` })) })
    datasette.runQuery.mockResolvedValueOnce({ formattedData: [{ entity: 1000, entry_number: 1000, field: 'name', value: 'last row' }] })
    await fetchResourceEntities(req, {}, vi.fn())
    expect(req.entities).toHaveLength(1001)
    expect(datasette.runQuery.mock.calls[1][2]).toEqual({ resource: 'latest', limit: 1000, offset: 1000 })
  })

  it('scopes issues by resource, dataset, type and field using named parameters', async () => {
    const req = request()
    scopeTaskResource(req, {}, vi.fn())
    datasette.runQuery.mockResolvedValueOnce({ formattedData: [{ entity: 1, entry_number: 2 }] })
    await fetchResourceIssues(req, {}, vi.fn())
    const [sql, dataset, params] = datasette.runQuery.mock.calls[0]
    expect(sql).toContain('resource = :resource AND dataset = :dataset')
    expect(sql).toContain('issue_type = :issueType AND field = :field')
    expect(dataset).toBe('tree')
    expect(params).toEqual({ resource: 'latest', dataset: 'tree', issueType: 'missing value', field: 'name', limit: 1000, offset: 0 })
    expect(issueMatchesEntry(req.issues[0], { entity: 1, 'entry-number': 1 })).toBe(false)
    expect(issueMatchesEntry(req.issues[0], { entity: 1, 'entry-number': 2 })).toBe(true)
  })

  it('propagates data failures instead of falling back to combined entities', async () => {
    const req = request()
    scopeTaskResource(req, {}, vi.fn())
    const error = new Error('resource unavailable')
    datasette.runQuery.mockRejectedValueOnce(error)
    const next = vi.fn()
    await fetchResourceEntities(req, {}, next)
    expect(next).toHaveBeenCalledWith(error)
    expect(req.entities).toBeUndefined()
  })
})
