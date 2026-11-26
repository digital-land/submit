// Disposable, test-only identity provider. Never deploy this as an identity service.
import { createServer } from 'node:http'
import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto'

const port = Number(process.env.MOCK_INTERNAL_ACCESS_PORT || 9456)
const issuer = process.env.MOCK_INTERNAL_ACCESS_ISSUER || `http://127.0.0.1:${port}`
const browserUrl = process.env.MOCK_INTERNAL_ACCESS_BROWSER_URL || issuer
const tokenLifetime = Number(process.env.MOCK_INTERNAL_ACCESS_TOKEN_LIFETIME || 300)
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const codes = new Map()
const accessTokens = new Map()
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')

createServer(async (req, res) => {
  const url = new URL(req.url, issuer)
  const json = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }
  if (url.pathname === '/.well-known/openid-configuration') {
    return json({
      issuer,
      end_session_endpoint: browserUrl + '/sign-out',
      authorization_endpoint: browserUrl + '/authorize',
      token_endpoint: issuer + '/token',
      userinfo_endpoint: issuer + '/userinfo',
      jwks_uri: issuer + '/jwks',
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256']
    })
  }
  if (url.pathname === '/jwks') return json({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test', alg: 'RS256', use: 'sig' }] })
  if (url.pathname === '/userinfo') {
    const token = req.headers.authorization?.replace(/^Bearer /, '')
    if (!(accessTokens.get(token) > Date.now())) {
      res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"')
      return json({ error: 'invalid_token' }, 401)
    }
    return json({ sub: 'test-user', email: 'test@council.gov.uk', email_verified: true })
  }
  if (url.pathname === '/sign-out') return json({ signedOut: true })
  if (url.pathname === '/authorize') {
    let redirect
    try { redirect = new URL(url.searchParams.get('redirect_uri')) } catch {
      return json({ error: 'invalid_redirect_uri' }, 400)
    }
    if (!['localhost', '127.0.0.1'].includes(redirect.hostname) || redirect.pathname !== '/auth/callback') return json({ error: 'invalid_redirect_uri' }, 400)
    const code = randomUUID()
    for (const [key, value] of codes) if (value.expiresAt < Date.now()) codes.delete(key)
    codes.set(code, { params: url.searchParams, expiresAt: Date.now() + 60000 })
    redirect.searchParams.set('code', code)
    redirect.searchParams.set('state', url.searchParams.get('state'))
    res.writeHead(302, { Location: redirect.href })
    return res.end()
  }
  if (url.pathname === '/token' && req.method === 'POST') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = new URLSearchParams(Buffer.concat(chunks).toString())
    const entry = codes.get(body.get('code'))
    codes.delete(body.get('code'))
    // OAuth Basic credentials are form-encoded before base64 encoding.
    if (!entry || entry.expiresAt < Date.now() ||
        req.headers.authorization !== 'Basic ' + Buffer.from('test%2Dclient:test%2Dsecret').toString('base64') ||
        body.get('redirect_uri') !== entry.params.get('redirect_uri') ||
        createHash('sha256').update(body.get('code_verifier') || '').digest('base64url') !== entry.params.get('code_challenge')) return json({ error: 'invalid_grant' }, 400)
    const now = Math.floor(Date.now() / 1000)
    const payload = { iss: issuer, sub: 'test-user', aud: 'test-client', iat: now, exp: now + 300, nonce: entry.params.get('nonce'), email: 'test@council.gov.uk', email_verified: true }
    const input = encode({ alg: 'RS256', kid: 'test' }) + '.' + encode(payload)
    const token = input + '.' + sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')
    for (const [key, expiry] of accessTokens) if (expiry < Date.now()) accessTokens.delete(key)
    const accessToken = randomUUID()
    accessTokens.set(accessToken, Date.now() + tokenLifetime * 1000)
    return json({ token_type: 'Bearer', access_token: accessToken, expires_in: tokenLifetime, id_token: token })
  }
  json({ error: 'not_found' }, 404)
}).listen(port, '0.0.0.0')
