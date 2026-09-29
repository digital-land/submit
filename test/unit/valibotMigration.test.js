import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { ConfigSchema, combineConfigs } from '../../config/util.js'
import { OrgDatasetOverview, OrgDatasetTaskList, OrgEndpointError, OrgOverviewPage } from '../../src/routes/schemas.js'
import mocker from '../utils/mocker.js'

describe('Valibot validation contracts', () => {
  it.each(['5000', 1.5, 0])('rejects an invalid configured port: %s', port => {
    expect(v.safeParse(ConfigSchema, { ...combineConfigs('test'), port }).success).toBe(false)
  })

  it('rejects invalid configuration URLs and notification template IDs', () => {
    const config = combineConfigs('test')
    config.asyncRequestApi.url = 'not-a-url'
    config.email.templates.RequestTemplateId = 'not-a-uuid'
    const result = v.safeParse(ConfigSchema, config)
    expect(result.success).toBe(false)
    expect(result.issues.map(issue => issue.path.map(part => part.key).join('.')))
      .toEqual(expect.arrayContaining(['asyncRequestApi.url', 'email.templates.RequestTemplateId']))
  })

  it('accepts missing, null and string documentation URLs', () => {
    const schema = OrgDatasetOverview.entries.stats.entries.endpoints.item
    const endpoint = { name: 'Example', endpoint: 'id', endpoint_url: 'https://example.com', lastAccessed: '2026-09-29', lastUpdated: null }
    for (const extra of [{}, { documentation_url: null }, { documentation_url: 'https://example.com/docs' }]) {
      expect(v.safeParse(schema, { ...endpoint, ...extra }).success).toBe(true)
    }
  })

  it('accepts relative task links', () => {
    expect(v.safeParse(OrgDatasetTaskList.entries.taskList.item, {
      title: { text: 'Fix data' },
      href: '/organisations/local-authority:LBH/tree/tasks',
      status: { tag: { classes: 'govuk-tag', text: 'Error' } }
    }).success).toBe(true)
  })

  it.each(['2026-09-29', '2026-09-29T12:30', '2026-09-29T12:30:00.000Z'])('accepts endpoint access date %s', date => {
    expect(v.safeParse(OrgEndpointError.entries.errorData, {
      endpoint_url: 'https://example.com/data.csv', latest_log_entry_date: date
    }).success).toBe(true)
  })

  it.each([OrgOverviewPage, OrgEndpointError, OrgDatasetTaskList])('generates data that satisfies its schema', schema => {
    for (const seed of [123456789, 2222222222, 8649740574]) {
      const data = mocker(schema, seed)
      expect(v.safeParse(schema, data).success).toBe(true)
    }
  })
})
