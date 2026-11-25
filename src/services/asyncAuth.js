import { createPrivateKey } from 'node:crypto'
import { SignJWT } from 'jose'
import { authenticationDisabled, currentUser } from './userIdentity.js'

const JWT_ISSUER = 'submit'
let signingConfig

export function configureAuth () {
  if (authenticationDisabled()) return
  const encoded = process.env.AUTH_JWT_PRIVATE_KEY || ''
  try {
    const pem = Buffer.from(encoded, 'base64')
    if (!encoded || pem.toString('base64') !== encoded) throw new Error('Invalid base64')
    const key = createPrivateKey(pem)
    if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) {
      throw new Error('Expected RSA key of at least 2048 bits')
    }
    const audience = process.env.AUTH_JWT_AUDIENCE || 'async'
    if (!audience.trim()) throw new Error('Empty audience')
    signingConfig = { key, audience }
    return signingConfig
  } catch {
    throw new Error('AUTH_JWT_PRIVATE_KEY must be a base64-encoded RSA private key of at least 2048 bits; JWT audience must be non-empty')
  }
}

export async function getAuthHeaders () {
  if (authenticationDisabled()) return {}
  const { key, audience } = signingConfig || configureAuth()
  const user = currentUser()
  const claims = { role: 'submit' }
  if (user) Object.assign(claims, { auth_provider: user.issuer, email: user.email, email_verified: true })
  const expires = Math.min(Math.floor(Date.now() / 1000) + 900, user ? Math.floor(user.expiresAt / 1000) : Infinity)
  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setAudience(audience)
    .setSubject(user?.sub || 'submit')
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(key)
  return { Authorization: `Bearer ${token}` }
}
