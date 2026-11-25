import { Router } from 'express'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { ACCESS_TOKEN_COOKIE, safeReturnPath, tokenCookieOptions, tokenFingerprint } from '../services/userIdentity.js'
import { createOidc, IdentityProviderUnavailableError } from '../services/oidc.js'
import { orgIdToName } from '../utils/orgIdToName.js'
import config from '../../config/index.js'

const save = session => new Promise((resolve, reject) => session.save(err => err ? reject(err) : resolve()))
const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

export function createAuthRouter ({ oidc = createOidc() } = {}) {
  const router = Router()
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    res.set('Referrer-Policy', 'no-referrer')
    next()
  })
  router.get('/', (req, res) => {
    const path = safeReturnPath(req.session.authReturnTo)
    const orgId = new URL(path, 'https://submit.invalid').searchParams.get('orgId')
    const mappedName = orgId && orgIdToName(orgId)
    const organisationName = (mappedName !== orgId && mappedName) || req.session['hmpo-wizard-check-wizard']?.lpa || 'your organisation'
    res.render('auth/intro.html', { organisationName, options: { lastPage: req.session.authBackTo || '/' } })
  })
  router.get('/login', wrap(async (req, res) => {
    try {
      const { transaction, url } = await oidc.start()
      req.session.oidc = { ...transaction, returnTo: safeReturnPath(req.session.authReturnTo) }
      await save(req.session)
      res.redirect(url)
    } catch {
      res.status(503).render('auth/error.html', { unavailable: true })
    }
  }))
  router.get('/callback', wrap(async (req, res) => {
    const transaction = req.session.oidc
    delete req.session.oidc
    await save(req.session)
    try {
      if (!transaction || transaction.expiresAt <= Date.now()) throw new Error('Expired login')
      const url = new URL(oidc.callbackUrl)
      url.search = new URL(req.originalUrl, url).search
      const { user, accessToken } = await oidc.finish(url, transaction)
      // Leave room for cookie attributes within the browser's 4 KB cookie limit.
      if (encodeURIComponent(accessToken).length > 3500 || user.expiresAt <= Date.now()) throw new Error('Invalid token lifetime or size')
      const journey = Object.fromEntries(Object.entries(req.session).filter(([key]) =>
        key.startsWith('hmpo-wizard-') || key.startsWith('hmpo-journey-') || ['checkRequestId', 'ipInformation', 'exists'].includes(key)))
      await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()))
      Object.assign(req.session, journey, { auth: { sub: user.sub, expiresAt: user.expiresAt, tokenHash: tokenFingerprint(accessToken) } })
      await save(req.session)
      res.cookie(ACCESS_TOKEN_COOKIE, accessToken, { ...tokenCookieOptions(config.secureCookies), maxAge: user.expiresAt - Date.now() })
      res.redirect(safeReturnPath(transaction.returnTo))
    } catch (error) {
      // Provider errors can contain codes/tokens. Never forward them to logging middleware.
      const unavailable = error instanceof IdentityProviderUnavailableError
      res.status(unavailable ? 503 : 400).render('auth/error.html', { unavailable })
    }
  }))
  router.get('/logout', (req, res) => {
    req.session.logoutCsrf = randomBytes(32).toString('hex')
    res.render('auth/logout.html', { csrfToken: req.session.logoutCsrf })
  })
  router.post('/logout', wrap(async (req, res) => {
    const expected = req.session.logoutCsrf
    const received = req.body?.csrfToken
    if (typeof received !== 'string' || !expected || Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return res.sendStatus(403)
    await new Promise((resolve, reject) => req.session.destroy(err => err ? reject(err) : resolve()))
    res.clearCookie('connect.sid', { path: '/' })
    res.clearCookie(ACCESS_TOKEN_COOKIE, tokenCookieOptions(config.secureCookies))
    res.redirect('/')
  }))
  return router
}
