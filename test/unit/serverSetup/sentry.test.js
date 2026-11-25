import { afterEach, expect, it, vi } from 'vitest'
import { NodeClient } from '@sentry/node'

afterEach(() => vi.unstubAllEnvs())

it('removes bearer cookies and login codes from request telemetry', async () => {
  vi.stubEnv('SENTRY_ENABLED', 'false')
  const { scrubAuthRequest } = await import('../../../src/serverSetup/sentry.js')
  const event = { request: { url: 'https://submit.example/auth/callback?code=secret', query_string: 'code=secret', cookies: { submit_access_token: 'secret-token' }, headers: { Cookie: 'submit_access_token=secret-token', authorization: 'Bearer secret-token', 'user-agent': 'browser' } } }
  expect(scrubAuthRequest(event)).toEqual({ request: { url: 'https://submit.example/auth/callback', headers: { 'user-agent': 'browser' } } })
})

it('removes callback query values from root and child spans in the outgoing transaction envelope', async () => {
  vi.stubEnv('SENTRY_ENABLED', 'false')
  const { scrubAuthRequest } = await import('../../../src/serverSetup/sentry.js')
  const envelopes = []
  const client = new NodeClient({
    dsn: 'https://test@example.invalid/1',
    integrations: [],
    beforeSendTransaction: scrubAuthRequest,
    transport: () => ({ send: async envelope => { envelopes.push(envelope); return { statusCode: 200 } }, flush: async () => true })
  })
  const url = 'https://submit.example/auth/callback?code=secret-code&state=secret-state'
  const data = { 'http.url': url, 'http.target': '/auth/callback?code=secret-code&state=secret-state', 'http.query': 'code=secret-code&state=secret-state', 'url.query': 'code=secret-code&state=secret-state', 'http.method': 'GET' }
  client.captureEvent({
    type: 'transaction',
    transaction: 'GET /auth/callback',
    start_timestamp: 1,
    timestamp: 2,
    request: { url },
    contexts: { trace: { trace_id: 'a'.repeat(32), span_id: 'b'.repeat(16), data: { ...data } } },
    spans: [{ trace_id: 'a'.repeat(32), span_id: 'c'.repeat(16), start_timestamp: 1, timestamp: 2, data: { ...data } }]
  })
  await client.flush(2000)
  const transaction = envelopes.flatMap(([, items]) => items).find(([header]) => header.type === 'transaction')?.[1]
  expect(transaction).toBeDefined()
  expect(JSON.stringify(transaction)).not.toMatch(/secret-code|secret-state/)
  for (const attributes of [transaction.contexts.trace.data, transaction.spans[0].data]) {
    expect(attributes['http.url']).toBe('https://submit.example/auth/callback')
    expect(attributes['http.target']).toBe('/auth/callback')
    expect(attributes['url.query']).toBeUndefined()
    expect(attributes['http.query']).toBeUndefined()
    expect(attributes['http.method']).toBe('GET')
  }
  await client.close()
})
