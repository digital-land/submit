import { createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID } from 'node:crypto'
import { closeSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse } from 'dotenv'

export function ensureLocalAuth (envPath = '.env', environment = process.env) {
  if (environment.NODE_ENV !== 'local') {
    throw new Error('Local authentication setup requires NODE_ENV=local')
  }
  let contents = ''
  try {
    contents = readFileSync(envPath, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const saved = parse(contents)
  const configured = { ...saved, ...environment }
  let privateKey
  if (configured.AUTH_JWT_PRIVATE_KEY) {
    try {
      privateKey = createPrivateKey(Buffer.from(configured.AUTH_JWT_PRIVATE_KEY, 'base64'))
      if (privateKey.asymmetricKeyType !== 'rsa' || privateKey.asymmetricKeyDetails.modulusLength < 2048) {
        throw new Error('Unsupported key')
      }
    } catch {
      throw new Error('Invalid AUTH_JWT_PRIVATE_KEY: expected a base64 RSA private key of at least 2048 bits')
    }
  } else {
    if (configured.SUBMIT_JWT_PUBLIC_KEY) {
      throw new Error('A public key is configured without its private key; supply AUTH_JWT_PRIVATE_KEY')
    }
    privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
  }
  const publicPem = createPublicKey(privateKey).export({ format: 'pem', type: 'spki' })
  if (configured.SUBMIT_JWT_PUBLIC_KEY) {
    const configuredPem = Buffer.from(configured.SUBMIT_JWT_PUBLIC_KEY, 'base64')
    if (/-----BEGIN [^-]*PRIVATE KEY-----/.test(configuredPem.toString())) {
      throw new Error('SUBMIT_JWT_PUBLIC_KEY must contain only public-key material, not a private key')
    }
    let matches = false
    try {
      matches = createPublicKey(configuredPem)
        .export({ format: 'pem', type: 'spki' }) === publicPem
    } catch {}
    if (!matches) throw new Error('SUBMIT_JWT_PUBLIC_KEY does not match AUTH_JWT_PRIVATE_KEY')
  }
  const values = {
    AUTH_JWT_PRIVATE_KEY: configured.AUTH_JWT_PRIVATE_KEY || Buffer.from(privateKey.export({ format: 'pem', type: 'pkcs8' })).toString('base64'),
    SUBMIT_JWT_PUBLIC_KEY: Buffer.from(publicPem).toString('base64'),
    AUTH_JWT_AUDIENCE: configured.AUTH_JWT_AUDIENCE || 'async'
  }
  for (const [name, value] of Object.entries(values)) {
    if (saved[name] === value) continue
    const line = `${name}=${JSON.stringify(value)}`
    const pattern = new RegExp(`^(?:export\\s+)?${name}\\s*=.*$`, 'gm')
    if (pattern.test(contents)) {
      contents = contents.replace(pattern, () => line)
    } else {
      contents += `${contents && !contents.endsWith('\n') ? '\n' : ''}${line}\n`
    }
  }
  const temporaryPath = join(dirname(envPath), `.${basename(envPath)}.${randomUUID()}.tmp`)
  const descriptor = openSync(temporaryPath, 'wx', 0o600)
  try {
    try {
      writeFileSync(descriptor, contents)
    } finally {
      closeSync(descriptor)
    }
    renameSync(temporaryPath, envPath)
  } finally {
    rmSync(temporaryPath, { force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    ensureLocalAuth()
    console.log('Local authentication keys ready in .env. Re-run npm run dev after changing keys to update Async.')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
