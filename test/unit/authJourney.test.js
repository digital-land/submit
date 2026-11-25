import express from 'express'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import { generateKeyPairSync } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { jwtVerify } from 'jose'
import { configureAuth, getAuthHeaders } from '../../src/services/asyncAuth.js'
import request from 'supertest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createAuthRouter } from '../../src/routes/auth.js'
import { createRequireUser, requireSameOrigin } from '../../src/middleware/auth.middleware.js'
import { currentUser, identityFromClaims, tokenFingerprint } from '../../src/services/userIdentity.js'
import { InvalidAccessTokenError, IdentityProviderUnavailableError } from '../../src/services/oidc.js'

let agent
let transaction
let claims
let store
let app
let providerError
afterEach(() => vi.unstubAllEnvs())
beforeEach(() => {
  claims = { sub: 'person-1', iss: 'https://sso.service.security.gov.uk', email: 'person@council.gov.uk', email_verified: true }
  providerError = undefined
  const oidc = {
    async start () {
      transaction = { state: 'state', nonce: 'nonce', verifier: 'verifier', expiresAt: Date.now() + 600000 }
      return { transaction, url: 'https://sso.service.security.gov.uk/oauth2/authorization' }
    },
    async finish (url, pending) {
      if (providerError) throw providerError
      if (url.searchParams.get('state') !== pending.state) throw new Error('Invalid state')
      return { user: identityFromClaims(claims), accessToken: 'test-access-token' }
    },
    async validate () {
      if (providerError) throw providerError
      return identityFromClaims(claims)
    },
    callbackUrl: 'https://submit.example/auth/callback'
  }
  app = express()
  store = new session.MemoryStore()
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, store }))
  app.use((req, res, next) => {
    res.render = (template, data) => res.json({ template, ...data })
    next()
  })
  app.get('/seed', (req, res) => {
    req.session['hmpo-wizard-check-wizard'] = { lpa: 'Test Council', dataset: 'tree' }
    req.session.unrelated = 'discard'
    res.json({ id: req.sessionID })
  })
  app.use('/auth', createAuthRouter({ oidc }))
  app.use(['/check', '/submit', '/api'], createRequireUser(oidc), requireSameOrigin('https://submit.example'))
  app.get('/check/dataset', (req, res) => res.json({ id: req.sessionID, user: req.session.user, requestUser: currentUser(), wizard: req.session['hmpo-wizard-check-wizard'], unrelated: req.session.unrelated }))
  app.post('/check/upload', (req, res) => res.sendStatus(204))
  agent = request.agent(app)
})

it.each(['/check/form', '/check/file', '/submit/file'])('preserves verified JWT identity through body parsing at %s', async path => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  vi.stubEnv('AUTH_JWT_PRIVATE_KEY', Buffer.from(privateKey.export({ format: 'pem', type: 'pkcs8' })).toString('base64'))
  vi.stubEnv('AUTHENTICATION_ON', 'true')
  configureAuth()
  const directory = await mkdtemp(join(tmpdir(), 'submit-auth-upload-'))
  app.post(path, multer({ dest: directory }).single('datafile'), async (req, res, next) => {
    try { res.json(await getAuthHeaders()) } catch (error) { next(error) }
  })
  try {
    await agent.get('/auth/login')
    await agent.get('/auth/callback?code=code&state=state')
    let pending = agent.post(path).set('Origin', 'https://submit.example')
    pending = path.endsWith('/form') ? pending.type('form').send({ email: 'untrusted@example.com' }) : pending.attach('datafile', Buffer.from('name\nTest'), 'data.csv')
    const response = await pending
    expect(response.status).toBe(200)
    const { payload } = await jwtVerify(response.body.Authorization.slice(7), publicKey)
    expect(payload).toMatchObject({ sub: claims.sub, email: claims.email, email_verified: true })
  } finally { await rm(directory, { recursive: true, force: true }) }
})

it('introduces authentication with the organisation and resumes after rotating the session', async () => {
  const seed = await agent.get('/seed')
  expect((await agent.get('/check/dataset')).headers.location).toBe('/auth')
  const intro = await agent.get('/auth')
  expect(intro.body.organisationName).toBe('Test Council')
  expect((await agent.get('/auth/login')).headers.location).toContain('sso.service.security.gov.uk')
  expect((await agent.get('/auth/callback?code=code&state=state')).headers.location).toBe('/check/dataset')
  const result = await agent.get('/check/dataset')
  expect(result.status).toBe(200)
  expect(result.body.id).not.toBe(seed.body.id)
  expect(result.body.user).toBeUndefined()
  expect(result.body.requestUser.sub).toBe('person-1')
  expect(result.body.wizard).toEqual({ lpa: 'Test Council', dataset: 'tree' })
  expect(result.body.unrelated).toBeUndefined()
  const sessions = await new Promise((resolve, reject) => store.all((err, data) => err ? reject(err) : resolve(data)))
  expect(JSON.stringify(sessions)).not.toContain('person@council.gov.uk')
  expect(JSON.stringify(sessions)).not.toContain('test-access-token')
  expect((await agent.get('/auth/callback?code=code&state=state')).status).toBe(400)
})

it('revalidates on every request and clears rejected tokens without replaying writes', async () => {
  await agent.get('/auth/login')
  const callback = await agent.get('/auth/callback?code=code&state=state')
  expect(callback.headers['set-cookie'].find(cookie => cookie.startsWith('submit_access_token='))).toMatch(/HttpOnly; SameSite=Lax/)
  claims.email = 'changed@council.gov.uk'
  expect((await agent.get('/check/dataset')).body.requestUser.email).toBe('changed@council.gov.uk')
  providerError = new InvalidAccessTokenError()
  const invalid = await agent.post('/check/upload').set('Origin', 'https://submit.example')
  expect(invalid.status).toBe(401)
  expect(invalid.headers['set-cookie'].join(';')).toContain('submit_access_token=;')
  expect((await agent.get('/check/dataset')).headers.location).toBe('/auth')
})

it.each(['GET', 'POST'])('rejects a binding that expires during validation on %s', async method => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const req = {
    method,
    originalUrl: '/check/dataset',
    cookies: { submit_access_token: 'token' },
    session: { auth: { sub: claims.sub, tokenHash: tokenFingerprint('token'), expiresAt: 1001 }, save: callback => callback() },
    get: vi.fn()
  }
  const res = { set: vi.fn(), clearCookie: vi.fn(), redirect: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn(), render: vi.fn(), locals: {} }
  const next = vi.fn()
  const guard = createRequireUser({
    async validate () {
      await Promise.resolve()
      clock.mockReturnValue(1001)
      return identityFromClaims(claims)
    }
  })
  try {
    await guard(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(req.session.auth).toBeUndefined()
    expect(res.clearCookie).toHaveBeenCalled()
    expect(res.locals.signedIn).toBeUndefined()
    if (method === 'GET') expect(res.redirect).toHaveBeenCalledWith('/auth')
    else expect(res.status).toHaveBeenCalledWith(401)
  } finally { clock.mockRestore() }
})

it.each([31, 60])('respects the one-hour scan login deadline after %s minutes', async minutes => {
  const now = Date.now()
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now + minutes * 60000)
  const req = {
    method: 'GET',
    originalUrl: '/check/upload-method',
    get: vi.fn(),
    cookies: { submit_access_token: 'token' },
    session: { auth: { sub: claims.sub, tokenHash: tokenFingerprint('token'), expiresAt: now + 3600000 }, save: callback => callback() }
  }
  const res = { set: vi.fn(), clearCookie: vi.fn(), redirect: vi.fn(), locals: {} }
  const next = vi.fn()
  try {
    await createRequireUser({ validate: async () => identityFromClaims(claims) })(req, res, next)
    if (minutes < 60) {
      expect(next).toHaveBeenCalledOnce()
      expect(req.session.auth.expiresAt).toBe(now + 3600000)
    } else {
      expect(next).not.toHaveBeenCalled()
      expect(res.redirect).toHaveBeenCalledWith('/auth')
    }
  } finally { clock.mockRestore() }
})

it('returns an availability error when the provider fails during the callback', async () => {
  await agent.get('/auth/login')
  providerError = new IdentityProviderUnavailableError()
  const result = await agent.get('/auth/callback?code=code&state=state')
  expect(result.status).toBe(503)
  expect(result.headers['set-cookie'] || []).not.toEqual(expect.arrayContaining([expect.stringContaining('submit_access_token=')]))
})

it('keeps the login on provider outages, then recovers', async () => {
  await agent.get('/auth/login')
  await agent.get('/auth/callback?code=code&state=state')
  providerError = new IdentityProviderUnavailableError()
  expect((await agent.get('/check/dataset')).status).toBe(503)
  providerError = undefined
  expect((await agent.get('/check/dataset')).status).toBe(200)
})

it('requires both the session binding and matching access-token cookie', async () => {
  await agent.get('/auth/login')
  const callback = await agent.get('/auth/callback?code=code&state=state')
  const sessionCookie = callback.headers['set-cookie'].find(cookie => cookie.startsWith('connect.sid=')).split(';')[0]
  expect((await request(app).get('/check/dataset').set('Cookie', 'submit_access_token=test-access-token')).status).toBe(302)
  expect((await request(app).get('/check/dataset').set('Cookie', `${sessionCookie}; submit_access_token=tampered`)).status).toBe(302)
})

it.each(['state', 'expired', 'email'])('rejects an invalid %s and does not authenticate', async mode => {
  await agent.get('/auth/login')
  if (mode === 'email') claims.email_verified = false
  if (mode === 'expired') {
    const sessions = await new Promise((resolve, reject) => store.all((err, value) => err ? reject(err) : resolve(value)))
    for (const [id, data] of Object.entries(sessions)) {
      data.oidc.expiresAt = 0
      await new Promise(resolve => store.set(id, data, resolve))
    }
  }
  const result = await agent.get(`/auth/callback?code=code&state=${mode === 'state' ? 'wrong' : 'state'}`)
  expect(result.status).toBe(400)
  expect((await agent.get('/check/dataset')).status).toBe(302)
})

it('blocks unauthenticated and cross-site writes, and destroys the session on logout', async () => {
  expect((await agent.post('/check/upload')).status).toBe(401)
  await agent.get('/auth/login')
  await agent.get('/auth/callback?code=code&state=state')
  expect((await agent.post('/check/upload').set('Origin', 'https://evil.example')).status).toBe(403)
  expect((await agent.post('/check/upload')).status).toBe(403)
  expect((await agent.post('/check/upload').set('Origin', 'https://submit.example')).status).toBe(204)
  const logout = await agent.get('/auth/logout')
  expect((await agent.post('/auth/logout').type('form').send({ csrfToken: 'wrong' })).status).toBe(403)
  expect((await agent.post('/auth/logout').type('form').send({ csrfToken: logout.body.csrfToken })).status).toBe(302)
  expect((await agent.get('/check/dataset')).status).toBe(302)
})

it('allows local journeys without a user or sign-in when authentication is off', async () => {
  vi.stubEnv('NODE_ENV', 'local')
  vi.stubEnv('AUTHENTICATION_ON', 'false')
  const result = await agent.get('/check/dataset')
  expect(result.status).toBe(200)
  expect(result.body.user).toBeUndefined()
  expect((await agent.post('/check/upload').set('Origin', 'http://localhost:8085')).status).toBe(204)
})

it('offers sign-in after an unauthenticated form POST and resumes its safe page without replaying the body', async () => {
  const response = await agent.post('/check/upload?dataset=tree').type('form').send({ data: 'do not retain' })
  expect(response.status).toBe(401)
  expect(response.body).toMatchObject({ template: 'auth/error.html', expired: true })
  await agent.get('/auth/login')
  const callback = await agent.get('/auth/callback?code=code&state=state')
  expect(callback.headers.location).toBe('/check/upload?dataset=tree')
  const sessions = await new Promise((resolve, reject) => store.all((err, data) => err ? reject(err) : resolve(data)))
  expect(JSON.stringify(sessions)).not.toContain('do not retain')
})

it('keeps unauthenticated API POST responses plain', async () => {
  const response = await agent.post('/api/status')
  expect(response.status).toBe(401)
  expect(response.text).toBe('Sign in again before continuing')
})

it.each([
  ['https://submit.example/organisations/local-authority:NET/tree?tab=tasks', '/organisations/local-authority:NET/tree?tab=tasks'],
  ['https://other.example/organisations', '/'],
  ['https://submit.example/auth/callback?code=secret', '/'],
  ['https://submit.example/check/url', '/'],
  ['invalid', '/']
])('provides a safe Back link for referrer %s', async (referer, expected) => {
  vi.stubEnv('INTERNAL_ACCESS_CALLBACK_URL', 'https://submit.example/auth/callback')
  await agent.get('/check/dataset').set('Referer', referer)
  expect((await agent.get('/auth')).body.options.lastPage).toBe(expected)
})
