import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash } from 'node:crypto'

export const userContext = new AsyncLocalStorage()
export const ACCESS_TOKEN_COOKIE = 'submit_access_token'
export const tokenFingerprint = token => createHash('sha256').update(token).digest('hex')
export const tokenCookieOptions = secure => ({ httpOnly: true, secure, sameSite: 'lax', path: '/' })

export function authenticationDisabled () {
  return process.env.NODE_ENV === 'local' && process.env.AUTHENTICATION_ON?.toLowerCase() === 'false'
}

export function identityFromClaims (claims, now = Date.now()) {
  if (typeof claims?.sub !== 'string' || !claims.sub.trim() ||
      typeof claims.iss !== 'string' || !claims.iss ||
      claims.email_verified !== true || typeof claims.email !== 'string' ||
      !/^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*gov\.uk$/i.test(claims.email)) {
    throw new Error('A verified gov.uk email address is required')
  }
  return { sub: claims.sub, issuer: claims.iss, email: claims.email, expiresAt: now + 8 * 60 * 60 * 1000 }
}

export function currentUser () {
  const context = userContext.getStore()
  if (!context) return undefined
  const user = context.user
  if (!user?.sub || !Number.isFinite(user.expiresAt) || user.expiresAt <= Date.now()) {
    throw new Error('Sign in again to use the request API')
  }
  return user
}

export function safeReturnPath (value) {
  const fallback = '/check/dataset'
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]|%0[ad]/i.test(value)) return fallback
  const url = new URL(value, 'https://submit.invalid')
  if (!/^\/(check|submit)(\/|$)/.test(url.pathname)) return fallback
  return url.pathname + url.search
}
