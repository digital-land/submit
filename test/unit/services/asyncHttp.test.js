import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import { jwtVerify } from 'jose'
import axios from 'axios'

vi.mock('axios')
vi.mock('../../../config/index.js', () => ({ default: { asyncRequestApi: { url: 'https://async.example.org', requestsEndpoint: 'requests' } } }))
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('AUTH_JWT_PRIVATE_KEY', Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64'))
  vi.stubEnv('AUTH_JWT_AUDIENCE', 'async')
})
afterEach(() => vi.unstubAllEnvs())

it('authenticates check, result, detail and geometry calls', async () => {
  const { postUrlRequest, getRequestData } = await import('../../../src/services/asyncRequestApi.js')
  axios.post.mockResolvedValue({ data: { id: 'id' } })
  axios.get.mockResolvedValue({ data: { id: 'id' }, headers: {} })
  expect(await postUrlRequest({ url: 'https://data.example.org' })).toBe('id')
  const result = await getRequestData('id')
  axios.get.mockResolvedValue({ data: [], headers: { 'x-pagination-total-results': '0' } })
  const details = await result.fetchResponseDetails()
  await details.getGeometries()
  const calls = [axios.post.mock.calls[0][2], ...axios.get.mock.calls.map(call => call[1])]
  expect(calls).toHaveLength(4)
  for (const options of calls) {
    expect(options.maxRedirects).toBe(0)
    const { payload } = await jwtVerify(options.headers.Authorization.slice(7), publicKey, { issuer: 'submit', audience: 'async' })
    expect(payload.role).toBe('submit')
  }
})

it('never sends the signing token to another origin', async () => {
  const { default: http } = await import('../../../src/services/asyncHttp.js')
  await expect(http.get('https://other.example.org')).rejects.toThrow(/configured API/)
  expect(axios.get).not.toHaveBeenCalled()
})

it('keeps the approved destination despite caller options and Axios defaults', async () => {
  const { default: http } = await import('../../../src/services/asyncHttp.js')
  const { default: realAxios } = await vi.importActual('axios')
  const overrides = { baseURL: 'https://other.example.org', allowAbsoluteUrls: false }
  const client = realAxios.create(overrides)
  const url = new URL('https://async.example.org/requests/id?offset=2')
  const approved = url.href
  const pending = [http.get(url, overrides), http.post(url, {}, overrides)]
  url.hostname = 'changed.example.org'
  await Promise.all(pending)
  const [destination, settings] = axios.get.mock.calls[0]
  expect(client.getUri({ ...settings, url: destination })).toBe(approved)
  const [postDestination, , postSettings] = axios.post.mock.calls[0]
  expect(client.getUri({ ...postSettings, url: postDestination })).toBe(approved)
})

it('removes transport credentials from errors', async () => {
  const { default: http } = await import('../../../src/services/asyncHttp.js')
  axios.get.mockImplementation(async (url, options) => {
    const error = new Error('Request failed')
    error.config = options
    error.request = { authorization: options.headers.Authorization }
    error.response = { status: 401, data: { detail: 'Invalid token' }, config: options }
    throw error
  })
  try {
    await http.get('https://async.example.org/requests/id')
    expect.unreachable()
  } catch (error) {
    expect(error.response.status).toBe(401)
    expect(error.config).toBeUndefined()
    expect(error.request).toBeUndefined()
    expect(error.response.config).toBeUndefined()
    expect(JSON.stringify(error)).not.toContain('Bearer')
  }
})
