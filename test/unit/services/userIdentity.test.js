import { describe, expect, it } from 'vitest'
import { identityFromClaims, safeReturnPath, userContext, currentUser } from '../../../src/services/userIdentity.js'

const claims = { sub: 'user-123', iss: 'https://sso.service.security.gov.uk', email: 'person@council.gov.uk', email_verified: true }

describe('verified user identity', () => {
  it('stores only identity and an eight-hour authentication expiry', () => {
    const user = identityFromClaims({ ...claims, access_token: 'secret', groups: ['admin'] }, 1000)
    expect(user).toEqual({ sub: 'user-123', issuer: claims.iss, email: claims.email, expiresAt: 28801000 })
  })
  it.each([
    { email_verified: false }, { email_verified: 'true' }, { email: 'user@gov.uk.evil.org' },
    { email: 'user@notgov.uk' }, { email: 'user@council.org.uk' }, { email: 'a@b@c.gov.uk' }, { sub: '' }
  ])('rejects untrusted identity %j', changes => {
    expect(() => identityFromClaims({ ...claims, ...changes })).toThrow()
  })
  it('isolates concurrent users and rejects expired identities', async () => {
    const users = await Promise.all(['one', 'two'].map(sub => userContext.run({ user: identityFromClaims({ ...claims, sub }) }, async () => {
      await new Promise(resolve => setTimeout(resolve, 5))
      return currentUser().sub
    })))
    expect(users).toEqual(['one', 'two'])
    expect(currentUser()).toBeUndefined()
    expect(() => userContext.run({ user: identityFromClaims(claims, 0) }, currentUser)).toThrow()
    expect(() => userContext.run({}, currentUser)).toThrow()
  })
  it.each(['https://evil.org', '//evil.org', '/\\evil.org', '/auth/login', '/check/../auth/login', '/check/%0d%0aLocation:evil'])('rejects unsafe return paths %s', path => {
    expect(safeReturnPath(path)).toBe('/check/dataset')
  })
  it('preserves local journey paths and queries', () => {
    expect(safeReturnPath('/check/link?orgId=local-authority:ABC')).toBe('/check/link?orgId=local-authority:ABC')
  })
})
