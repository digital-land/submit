import { generateKeyPairSync } from 'node:crypto'
import { exportJWK, SignJWT } from 'jose'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createOidc } from '../../../src/services/oidc.js'

const issuer = 'https://identity.example'
const callbackUrl = 'https://submit.example/auth/callback'
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
let oidc
let pending
let overrides
let wrongKey
let tokenForm
let tokenAuth
let info
let userInfoStatus
let tokenStatus

beforeEach(() => {
  overrides = {}
  wrongKey = false
  userInfoStatus = 200
  tokenStatus = 200
  info = { sub: 'user-123', email: 'person@council.gov.uk', email_verified: true }
  oidc = createOidc({ INTERNAL_ACCESS_ISSUER: issuer, INTERNAL_ACCESS_CALLBACK_URL: callbackUrl, INTERNAL_ACCESS_CLIENT_ID: 'client', INTERNAL_ACCESS_CLIENT_SECRET: 'secret' })
  vi.stubGlobal('fetch', async (url, options) => {
    const path = new URL(url).pathname
    if (path === '/.well-known/openid-configuration') return Response.json({ issuer, end_session_endpoint: issuer + '/sign-out', authorization_endpoint: issuer + '/authorize', token_endpoint: issuer + '/token', userinfo_endpoint: issuer + '/userinfo', jwks_uri: issuer + '/jwks', response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'] })
    if (path === '/jwks') return Response.json({ keys: [{ ...await exportJWK(publicKey), kid: 'key', use: 'sig', alg: 'RS256' }] })
    if (path === '/userinfo') return Response.json(info, { status: userInfoStatus })
    if (path !== '/token') throw new Error('Unexpected URL')
    if (tokenStatus === 'network') throw new TypeError('fetch failed')
    if (tokenStatus !== 200) return Response.json({ error: 'temporarily_unavailable' }, { status: tokenStatus })
    tokenForm = new URLSearchParams(options.body)
    tokenAuth = new Headers(options.headers).get('authorization')
    const token = await new SignJWT({ nonce: pending.nonce, email: 'person@council.gov.uk', email_verified: true, ...overrides })
      .setProtectedHeader({ alg: 'RS256', kid: 'key' }).setIssuer(issuer).setSubject('user-123').setAudience('client').setIssuedAt().setExpirationTime('5m').sign(wrongKey ? otherKey : privateKey)
    return Response.json({ access_token: 'access', expires_in: 300, token_type: 'Bearer', id_token: token })
  })
})
afterEach(() => vi.unstubAllGlobals())

async function begin () {
  const start = await oidc.start()
  pending = start.transaction
  return new URL(start.url)
}
const callback = () => new URL(`${callbackUrl}?code=code&state=${pending.state}`)

it('uses the discovered logout endpoint without tokens or a return URL', async () => {
  expect(await oidc.logoutUrl()).toBe(issuer + '/sign-out?client_id=client')
})

it('uses discovery, PKCE, nonce and basic client authentication with signed ID tokens', async () => {
  const url = await begin()
  expect(url.searchParams.get('scope')).toBe('openid email profile')
  expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  expect(url.searchParams.get('nonce')).toBe(pending.nonce)
  expect(url.searchParams.get('redirect_uri')).toBe(callbackUrl)
  const result = await oidc.finish(callback(), pending)
  expect(result.user.sub).toBe('user-123')
  expect(result.accessToken).toBe('access')
  expect(result.user.expiresAt).toBeLessThanOrEqual(Date.now() + 300000)
  expect(tokenForm.get('code_verifier')).toBe(pending.verifier)
  expect(tokenForm.get('redirect_uri')).toBe(callbackUrl)
  expect(tokenAuth).toBe('Basic Y2xpZW50OnNlY3JldA==')
})

it.each(['state', 'nonce', 'signature'])('rejects incorrect %s', async kind => {
  await begin()
  const url = callback()
  if (kind === 'state') url.searchParams.set('state', 'wrong')
  if (kind === 'nonce') overrides.nonce = 'wrong'
  if (kind === 'signature') wrongKey = true
  await expect(oidc.finish(url, pending)).rejects.toThrow()
})

it('retrieves missing email claims from UserInfo and checks the subject', async () => {
  await begin()
  overrides.email = undefined
  overrides.email_verified = undefined
  expect((await oidc.finish(callback(), pending)).user).toMatchObject({ sub: info.sub, email: info.email })
  info.sub = 'another-user'
  await expect(oidc.finish(callback(), pending)).rejects.toThrow()
})

it('validates the access token through UserInfo each time and distinguishes invalid tokens from outages', async () => {
  expect(await oidc.validate('access', 'user-123')).toMatchObject({ sub: 'user-123', email: info.email })
  info.email = 'changed@council.gov.uk'
  expect((await oidc.validate('access', 'user-123')).email).toBe(info.email)
  userInfoStatus = 401
  await expect(oidc.validate('access', 'user-123')).rejects.toMatchObject({ name: 'InvalidAccessTokenError' })
  userInfoStatus = 503
  await expect(oidc.validate('access', 'user-123')).rejects.toMatchObject({ name: 'IdentityProviderUnavailableError' })
})

it('rejects missing client registration', async () => {
  await expect(createOidc({}).start()).rejects.toThrow(/configuration/)
})

it.each([503, 'network'])('classifies a token-exchange outage (%s) as unavailable', async status => {
  await begin()
  tokenStatus = status
  await expect(oidc.finish(callback(), pending)).rejects.toMatchObject({ name: 'IdentityProviderUnavailableError' })
})
