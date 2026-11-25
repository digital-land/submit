import * as client from 'openid-client'
import { identityFromClaims } from './userIdentity.js'

export class InvalidAccessTokenError extends Error {
  constructor () { super('Sign in again'); this.name = 'InvalidAccessTokenError' }
}

export class IdentityProviderUnavailableError extends Error {
  constructor () { super('Sign-in is currently unavailable'); this.name = 'IdentityProviderUnavailableError' }
}

export function createOidc (env = process.env) {
  let configuration
  const issuer = env.INTERNAL_ACCESS_ISSUER || 'https://sso.service.security.gov.uk'
  const callbackUrl = env.INTERNAL_ACCESS_CALLBACK_URL
  async function getConfiguration () {
    if (!env.INTERNAL_ACCESS_CLIENT_ID || !env.INTERNAL_ACCESS_CLIENT_SECRET || !callbackUrl) throw new Error('Internal Access configuration is required')
    const callback = new URL(callbackUrl)
    if (callback.username || callback.password || callback.search || callback.hash || callback.pathname !== '/auth/callback' ||
        (callback.protocol !== 'https:' && !(callback.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(callback.hostname)))) throw new Error('Invalid OIDC callback URL')
    if (!configuration) {
      const execute = [client.enableNonRepudiationChecks]
      // Test providers still exercise the complete protocol; only transport differs.
      if (['test', 'ci'].includes(env.NODE_ENV)) execute.push(client.allowInsecureRequests)
      configuration = client.discovery(new URL(issuer), env.INTERNAL_ACCESS_CLIENT_ID, undefined, client.ClientSecretBasic(env.INTERNAL_ACCESS_CLIENT_SECRET), { execute, timeout: 10 })
        .catch(error => { configuration = undefined; throw error })
    }
    return configuration
  }
  async function validate (accessToken, subject) {
    let info
    try {
      const config = await getConfiguration()
      info = await client.fetchUserInfo(config, accessToken, subject)
    } catch (error) {
      // Discard provider errors: they may contain bearer credentials or personal data.
      if ((error.response || error.cause)?.status === 401 ||
          ['OAUTH_JWT_CLAIM_COMPARISON_FAILED', 'OAUTH_JSON_ATTRIBUTE_COMPARISON_FAILED'].includes(error.code)) throw new InvalidAccessTokenError()
      throw new IdentityProviderUnavailableError()
    }
    try { return identityFromClaims({ ...info, iss: issuer }) } catch { throw new InvalidAccessTokenError() }
  }
  return {
    callbackUrl,
    validate,
    async start () {
      const config = await getConfiguration()
      const transaction = { state: client.randomState(), nonce: client.randomNonce(), verifier: client.randomPKCECodeVerifier(), expiresAt: Date.now() + 10 * 60 * 1000 }
      const url = client.buildAuthorizationUrl(config, {
        redirect_uri: callbackUrl,
        scope: 'openid email profile',
        state: transaction.state,
        nonce: transaction.nonce,
        code_challenge: await client.calculatePKCECodeChallenge(transaction.verifier),
        code_challenge_method: 'S256'
      })
      return { transaction, url: url.href }
    },
    async finish (url, transaction) {
      let config
      try { config = await getConfiguration() } catch { throw new IdentityProviderUnavailableError() }
      let tokens
      try {
        tokens = await client.authorizationCodeGrant(config, url, {
          expectedState: transaction.state,
          expectedNonce: transaction.nonce,
          pkceCodeVerifier: transaction.verifier,
          idTokenExpected: true
        })
      } catch (error) {
        const status = (error.response || error.cause)?.status
        if (!error.code || status >= 500 || status === 429 || ['OAUTH_TIMEOUT', 'OAUTH_ABORT'].includes(error.code)) throw new IdentityProviderUnavailableError()
        throw new InvalidAccessTokenError()
      }
      const claims = tokens.claims()
      if (!claims) throw new Error('Missing ID token')
      const user = await validate(tokens.access_token, claims.sub)
      if (Number.isFinite(tokens.expires_in)) user.expiresAt = Math.min(user.expiresAt, Date.now() + tokens.expires_in * 1000)
      return { user, accessToken: tokens.access_token }
    }
  }
}
