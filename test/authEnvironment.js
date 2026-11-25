import { generateKeyPairSync } from 'node:crypto'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// Disposable test credentials, never deployment keys.
export function createAuthEnvironment () {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  return {
    AUTH_JWT_PRIVATE_KEY: Buffer.from(privateKey.export({ format: 'pem', type: 'pkcs8' })).toString('base64'),
    AUTH_JWT_AUDIENCE: 'async',
    SUBMIT_JWT_PUBLIC_KEY: Buffer.from(publicKey.export({ format: 'pem', type: 'spki' })).toString('base64')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.GITHUB_ENV) throw new Error('Expected GITHUB_ENV in the test job')
  appendFileSync(process.env.GITHUB_ENV, Object.entries(createAuthEnvironment())
    .map(([name, value]) => `${name}=${value}\n`).join(''))
}
