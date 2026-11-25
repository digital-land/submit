import { generateKeyPairSync } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jwtVerify } from 'jose'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const encodedKey = Buffer.from(privateKey.export({ format: 'pem', type: 'pkcs8' })).toString('base64')

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('AUTH_JWT_PRIVATE_KEY', encodedKey)
  vi.stubEnv('AUTH_JWT_ISSUER', 'ignored-environment-value')
  vi.stubEnv('AUTH_JWT_AUDIENCE', 'async')
})
afterEach(() => vi.unstubAllEnvs())

describe('Submit signing', () => {
  it('needs no signing key and sends no token when authentication is disabled locally', async () => {
    vi.stubEnv('NODE_ENV', 'local')
    vi.stubEnv('AUTHENTICATION_ON', 'false')
    vi.stubEnv('AUTH_JWT_PRIVATE_KEY', '')
    const { configureAuth, getAuthHeaders } = await import('../../../src/services/asyncAuth.js')
    expect(() => configureAuth()).not.toThrow()
    expect(await getAuthHeaders()).toEqual({})
  })

  it.each(['production', 'staging', 'development', 'test', 'ci'])('rejects disabling authentication in %s', async environment => {
    vi.stubEnv('NODE_ENV', environment)
    vi.stubEnv('AUTHENTICATION_ON', 'false')
    const { configureAuth } = await import('../../../src/services/asyncAuth.js')
    expect(() => configureAuth()).toThrow(/only.*local/)
  })

  it('signs the session user subject with submit permissions and bounded expiry', async () => {
    const { userContext } = await import('../../../src/services/userIdentity.js')
    const { getAuthHeaders } = await import('../../../src/services/asyncAuth.js')
    const expiresAt = Date.now() + 60000
    const headers = await userContext.run({ user: { sub: 'oidc-user', issuer: 'https://sso.service.security.gov.uk', email: 'person@council.gov.uk', expiresAt, role: 'admin' } }, getAuthHeaders)
    const { payload } = await jwtVerify(headers.Authorization.slice(7), publicKey, { issuer: 'submit', audience: 'async' })
    expect(payload).toMatchObject({ sub: 'oidc-user', role: 'submit', auth_provider: 'https://sso.service.security.gov.uk', email: 'person@council.gov.uk', email_verified: true })
    expect(payload.exp).toBeLessThanOrEqual(Math.floor(expiresAt / 1000))
    expect(payload.username).toBeUndefined()
  })
  it('signs a short-lived service identity using its own RSA key', async ({ onTestFinished }) => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-01-01T00:00:00Z') })
    onTestFinished(() => vi.useRealTimers())
    const { getAuthHeaders } = await import('../../../src/services/asyncAuth.js')
    const headers = await getAuthHeaders()
    const { payload } = await jwtVerify(headers.Authorization.slice(7), publicKey, {
      algorithms: ['RS256'], issuer: 'submit', audience: 'async'
    })
    expect(payload.sub).toBe('submit')
    expect(payload.role).toBe('submit')
    expect(payload.exp - payload.iat).toBe(900)
  })

  it.each(['', 'invalid-base64', Buffer.from('not a key').toString('base64')])('rejects invalid configuration', async key => {
    vi.stubEnv('AUTH_JWT_PRIVATE_KEY', key)
    const { configureAuth } = await import('../../../src/services/asyncAuth.js')
    expect(() => configureAuth()).toThrow(/AUTH_JWT_PRIVATE_KEY/)
  })

  it('rejects weak RSA keys', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 1024 })
    vi.stubEnv('AUTH_JWT_PRIVATE_KEY', Buffer.from(privateKey.export({ format: 'pem', type: 'pkcs8' })).toString('base64'))
    const { configureAuth } = await import('../../../src/services/asyncAuth.js')
    expect(() => configureAuth()).toThrow(/2048/)
  })
})
