import { ACCESS_TOKEN_COOKIE, authenticationDisabled, safeReturnPath, tokenCookieOptions, tokenFingerprint, userContext } from '../services/userIdentity.js'
import { createOidc, InvalidAccessTokenError } from '../services/oidc.js'
import config from '../../config/index.js'

export function createRequireUser (oidc = createOidc()) {
  return (req, res, next) => authenticate(req, res, next, oidc).catch(next)
}

export function createOptionalUser (oidc = createOidc()) {
  return (req, res, next) => {
    if (res.locals.signedIn || !['GET', 'HEAD'].includes(req.method) || /^\/(?:health|api)(?:\/|$)/.test(req.path) ||
        (!req.session.auth && !req.cookies?.[ACCESS_TOKEN_COOKIE])) return next()
    return authenticate(req, res, next, oidc, false).catch(next)
  }
}

async function authenticate (req, res, next, oidc, required = true) {
  res.set('Cache-Control', 'no-store')
  if (authenticationDisabled()) return next()
  const binding = req.session.auth
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE]
  let user
  if (typeof token === 'string' && binding?.sub && Number.isFinite(binding.expiresAt) &&
      binding.expiresAt > Date.now() && binding.tokenHash === tokenFingerprint(token)) {
    try {
      const validatedUser = await oidc.validate(token, binding.sub)
      if (binding.expiresAt > Date.now()) {
        user = validatedUser
        user.expiresAt = binding.expiresAt
      }
    } catch (error) {
      if (!(error instanceof InvalidAccessTokenError)) {
        if (!required) return next()
        return res.status(503).render('auth/error.html', { unavailable: true })
      }
    }
  }
  if (!user) {
    delete req.session.auth
    res.clearCookie(ACCESS_TOKEN_COOKIE, tokenCookieOptions(config.secureCookies))
    if (!required) return next()
    if (req.originalUrl.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(401).send('Sign in again before continuing')
      return res.status(401).json({ error: 'Sign in again before continuing' })
    }
    req.session.authReturnTo = safeReturnPath(req.originalUrl)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return req.session.save(err => err ? next(err) : res.status(401).render('auth/error.html', { expired: true }))
    }
    req.session.authBackTo = '/'
    try {
      const previous = new URL(req.get('referer'))
      const origin = new URL(process.env.INTERNAL_ACCESS_CALLBACK_URL || config.url).origin
      if (previous.origin === origin && /^\/(?:organisations|guidance)(?:\/|$)/.test(previous.pathname)) {
        req.session.authBackTo = previous.pathname + previous.search
      }
    } catch { /* Direct visits have no referring page; use the start page. */ }
    return req.session.save(err => err ? next(err) : res.redirect('/auth'))
  }
  res.locals.signedIn = true
  res.locals.signedInEmail = user.email
  return userContext.run({ user }, next)
}

export const requireUser = createRequireUser()
export const optionalUser = createOptionalUser()

// Origin checking also covers multipart uploads before their bodies are parsed.
// Missing/null origins fail closed; modern browser form POSTs send Origin.
export function requireSameOrigin (applicationUrl) {
  const origin = new URL(applicationUrl).origin
  return (req, res, next) => {
    if (authenticationDisabled() || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    if (req.get('origin') !== origin) return res.status(403).send('Invalid request origin')
    next()
  }
}
