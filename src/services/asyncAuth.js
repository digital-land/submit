import { createPrivateKey } from 'node:crypto'
import { SignJWT } from 'jose'

const JWT_ISSUER = 'submit'
let signingConfig

export function configureAuth () {
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
  const { key, audience } = signingConfig || configureAuth()
  const token = await new SignJWT({ role: 'submit' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setAudience(audience)
    .setSubject('submit')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(key)
  return { Authorization: `Bearer ${token}` }
}
