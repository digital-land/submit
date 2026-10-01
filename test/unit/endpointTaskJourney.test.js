import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { JSDOM } from 'jsdom'
import organisations from '../../src/routes/organisations.js'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import datasette from '../../src/services/datasette.js'
import platformApi from '../../src/services/platformApi.js'
import config from '../../config/index.js'

vi.mock('../../src/services/datasette.js', () => ({ default: { runQuery: vi.fn().mockResolvedValue({ formattedData: [] }) } }))
vi.mock('../../src/services/platformApi.js', () => ({ default: { fetchTasks: vi.fn(), fetchEntities: vi.fn(), fetchAllEntities: vi.fn() } }))
vi.mock('../../src/utils/redisLoader.js', () => ({
  getOrganisationList: vi.fn().mockResolvedValue([{ organisation: 'local-authority:TST' }]),
  getRedisClient: vi.fn().mockResolvedValue(null)
}))

const root = '/organisations/local-authority%3ATST/tree'
const scoped = `${root}/endpoint/a/resource/ra/missing%20value/name`
const sources = [
  { endpoint: 'b', resource: 'rb', endpoint_url: 'https://example.com/b.csv', endpoint_entry_date: '2026-03-01', status: 200 },
  { endpoint: 'a', resource: 'ra', endpoint_url: 'https://example.com/a.csv', endpoint_entry_date: '2026-01-01', status: 200 },
  { endpoint: 'healthy', resource: 'rc', endpoint_url: 'https://example.com/healthy.csv', endpoint_entry_date: '2026-02-01', status: 200 }
]

function app () {
  const app = express()
  setupNunjucks({ app, datasetNameMapping: new Map() })
  app.use('/organisations', organisations)
  app.use((err, req, res, next) => res.status(err.statusCode || 500).send(err.message))
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  platformApi.fetchEntities.mockResolvedValue({ formattedData: [{ entity: 1 }], data: { count: 2 } })
  platformApi.fetchAllEntities.mockResolvedValue({ formattedData: [] })
  platformApi.fetchTasks.mockResolvedValue({
    formattedData: {
      tasks: sources.slice(0, 2).map(source => ({
        dataset: 'tree',
        endpoint: source.endpoint,
        resource: source.resource,
        details: { issue_type: 'missing value', field: 'name', count: 2 }
      })),
      count: 2
    }
  })
  datasette.runQuery.mockImplementation(async (sql, database, params = {}) => {
    let rows = []
    if (sql.includes('FROM organisation') || sql.includes('from organisation WHERE')) {
      rows = [{ name: 'Test Council', organisation: 'local-authority:TST', entity: 100, statistical_geography: 'E12345678' }]
    } else if (sql.includes('FROM dataset WHERE')) {
      rows = [{ dataset: 'tree', name: 'Tree', collection: 'tree' }]
    } else if (sql.includes('SELECT DISTINCT')) {
      rows = sources.map(source => ({ ...source, dataset: 'tree', entry_count: 2 }))
    } else if (sql.includes('WITH RankedEndpoints')) {
      rows = sources
    } else if (sql.includes('FROM fact_resource fr JOIN fact')) {
      // The same entity exists in both endpoints, with different supplied values.
      const label = params.resource === 'ra' ? 'Endpoint A' : 'Endpoint B'
      rows = Array.from({ length: config.tablePageLength + 1 }, (_, i) => i + 1).flatMap(i => [
        { entity: i, entry_number: i, field: 'reference', value: `${label} reference ${i}` },
        { entity: i, entry_number: i, field: 'description', value: `${label} description ${i}` },
        { entity: i, entry_number: i, field: 'point', value: params.resource === 'ra' ? 'POINT (-1 52)' : 'POINT (-2 53)' }
      ])
    } else if (sql.includes('FROM issue') && sql.includes('resource = :resource')) {
      rows = Array.from({ length: config.tablePageLength + 1 }, (_, i) => ({ entity: i + 1, entry_number: i + 1, field: 'name', issue_type: 'missing value', message: 'Enter a name', value: '' }))
    } else if (sql.includes('FROM dataset_resource') || sql.includes('SELECT entry_count FROM dataset_resource')) {
      rows = [{ resource: 'ra', entry_count: 2 }]
    } else if (sql.includes('count(*) AS count') || sql.includes('COUNT(*) as count')) {
      rows = [{ count: 2 }]
    } else if (sql.includes('from issue i')) {
      rows = [{ entity: '', entry_number: 1, line_number: 2, field: 'reference', issue_type: 'missing value', message: 'Enter a reference', value: '' }]
    } else if (sql.includes('from dataset_field')) {
      rows = ['reference', 'name', 'description', 'point'].map(field => ({ field }))
    }
    return { formattedData: rows }
  })
})

describe('endpoint task journey', () => {
  it('renders distinct task lists and unique accessible task IDs for affected endpoints only', async () => {
    const response = await request(app()).get(root)
    expect(response.status, response.text).toBe(200)
    const document = new JSDOM(response.text).window.document
    const lists = document.querySelectorAll('.govuk-task-list')
    expect(lists).toHaveLength(2)
    expect(lists[0].querySelector('a').getAttribute('href')).toContain('/endpoint/b/resource/rb/')
    expect(lists[1].querySelector('a').getAttribute('href')).toBe(scoped)
    expect(response.text).not.toContain('healthy.csv')
    const endpointHeadings = [...document.querySelectorAll('h2[id^="endpoint-heading-"]')]
    expect(endpointHeadings.map(heading => heading.textContent.trim())).toEqual(['Endpoint 3', 'Endpoint 1'])
    const ids = [...document.querySelectorAll('.govuk-task-list [id]')].map(element => element.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(document.querySelector('.app-c-dataset-navigation__notification-badge').textContent).toContain('2')
  })

  it('keeps the resource in table pagination, record links and the detail back link', async () => {
    const agent = request(app())
    const response = await agent.get(scoped)
    expect(response.status, response.text).toBe(200)
    expect(response.text).toContain('Endpoint A description 1')
    expect(response.text).not.toContain('Endpoint B')
    expect(response.text).toContain('POINT (-1 52)')
    expect(response.text).not.toContain('POINT (-2 53)')
    const document = new JSDOM(response.text).window.document
    const next = document.querySelector('.govuk-pagination__next a').getAttribute('href')
    expect(next).toBe(`${scoped}/2`)
    const second = await agent.get(next)
    expect(second.status, second.text).toBe(200)
    expect(second.text).toContain(`Endpoint A description ${config.tablePageLength + 1}`)
    const detail = await agent.get(`${scoped}/entity/2`)
    expect(detail.status, detail.text).toBe(200)
    expect(detail.text).toContain('Endpoint A description 2')
    expect(detail.text).toContain(`href="${scoped}"`)
    expect(detail.text).toContain('https://example.com/a.csv')
  })

  it('retains endpoint context when redirecting to an entry-level issue', async () => {
    const url = `${root}/endpoint/a/resource/ra/missing%20value/reference`
    const agent = request(app())
    const redirect = await agent.get(url)
    expect(redirect.status).toBe(302)
    expect(redirect.headers.location).toBe(`${url}/entry`)
    const response = await agent.get(redirect.headers.location)
    expect(response.status, response.text).toBe(200)
    expect(response.text).toContain('https://example.com/a.csv')
    expect(response.text).not.toContain('https://example.com/b.csv')
    expect(response.text).toContain(`${url}/entry/2`)
  })

  it('returns 404 for an unknown endpoint, mismatched resource or superseded resource', async () => {
    const agent = request(app())
    expect((await agent.get(scoped.replace('/endpoint/a/', '/endpoint/unknown/'))).status).toBe(404)
    expect((await agent.get(scoped.replace('/resource/ra/', '/resource/rb/'))).status).toBe(404)
    expect((await agent.get(scoped.replace('/resource/ra/', '/resource/old/'))).status).toBe(404)
  })
})
