import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'
import { parse } from 'dotenv'
import { ensureLocalAuth as setupAuth } from '../../scripts/setup-local-auth.js'

const ensureLocalAuth = (envPath, environment) => setupAuth(envPath, { NODE_ENV: 'local', ...environment })

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, writeFileSync: vi.fn(actual.writeFileSync), renameSync: vi.fn(actual.renameSync) }
})

describe('local authentication setup', () => {
  let directory
  let envPath
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'submit-local-auth-'))
    envPath = join(directory, '.env')
  })
  afterEach(() => rmSync(directory, { recursive: true, force: true }))

  it.each([undefined, 'development', 'staging', 'production', 'test', 'ci'])('rejects NODE_ENV=%s before creating or modifying .env', (nodeEnv) => {
    expect(() => setupAuth(envPath, { NODE_ENV: nodeEnv })).toThrow(/NODE_ENV=local/)
    expect(existsSync(envPath)).toBe(false)
    const original = '# existing settings\nNODE_ENV=local\n'
    writeFileSync(envPath, original, { mode: 0o640 })
    expect(() => setupAuth(envPath, { NODE_ENV: nodeEnv })).toThrow(/NODE_ENV=local/)
    expect(readFileSync(envPath, 'utf8')).toBe(original)
    expect(statSync(envPath).mode & 0o777).toBe(0o640)
  })

  it('creates a matching pair with restricted permissions and reuses it', () => {
    ensureLocalAuth(envPath, {})
    const original = readFileSync(envPath, 'utf8')
    const values = parse(original)
    const privateKey = createPrivateKey(Buffer.from(values.AUTH_JWT_PRIVATE_KEY, 'base64'))
    const publicKey = createPublicKey(Buffer.from(values.SUBMIT_JWT_PUBLIC_KEY, 'base64'))
    const message = Buffer.from('local request')
    expect(verify('sha256', message, publicKey, sign('sha256', message, privateKey))).toBe(true)
    expect(values.AUTH_JWT_AUDIENCE).toBe('async')
    expect(statSync(envPath).mode & 0o777).toBe(0o600)
    ensureLocalAuth(envPath, {})
    expect(readFileSync(envPath, 'utf8')).toBe(original)
  })

  it('fills empty placeholders while preserving unrelated settings and comments', () => {
    writeFileSync(envPath, '# local settings\nPORT=5000\nAUTH_JWT_PRIVATE_KEY=\nSUBMIT_JWT_PUBLIC_KEY=\nAUTH_JWT_AUDIENCE=custom\n')
    ensureLocalAuth(envPath, {})
    const contents = readFileSync(envPath, 'utf8')
    expect(contents).toContain('# local settings\nPORT=5000\n')
    expect(parse(contents).AUTH_JWT_PRIVATE_KEY).toBeTruthy()
    expect(parse(contents).AUTH_JWT_AUDIENCE).toBe('custom')
  })

  it('derives a missing public key without rotating the private key', () => {
    ensureLocalAuth(envPath, {})
    const original = parse(readFileSync(envPath, 'utf8'))
    writeFileSync(envPath, `AUTH_JWT_PRIVATE_KEY=${original.AUTH_JWT_PRIVATE_KEY}\n`)
    ensureLocalAuth(envPath, {})
    expect(parse(readFileSync(envPath, 'utf8'))).toEqual(original)
  })

  it('rejects a public key without a private key without modifying the file', () => {
    const contents = 'SUBMIT_JWT_PUBLIC_KEY=existing\n'
    writeFileSync(envPath, contents)
    expect(() => ensureLocalAuth(envPath, {})).toThrow(/private key/i)
    expect(readFileSync(envPath, 'utf8')).toBe(contents)
  })

  it.each(['file', 'environment'])('skips key validation and writes when bypass is configured in %s', source => {
    const contents = `${source === 'file' ? 'AUTHENTICATION_ON=false\n' : ''}SUBMIT_JWT_PUBLIC_KEY=existing\nAUTH_JWT_PRIVATE_KEY=invalid\n`
    writeFileSync(envPath, contents)
    expect(() => ensureLocalAuth(envPath, source === 'environment' ? { AUTHENTICATION_ON: 'false' } : {})).not.toThrow()
    expect(readFileSync(envPath, 'utf8')).toBe(contents)
  })

  it('rejects mismatched keys without modifying the file', () => {
    ensureLocalAuth(envPath, {})
    const contents = readFileSync(envPath, 'utf8')
    const otherPath = join(directory, 'other.env')
    ensureLocalAuth(otherPath, {})
    const other = parse(readFileSync(otherPath, 'utf8'))
    expect(() => ensureLocalAuth(envPath, { SUBMIT_JWT_PUBLIC_KEY: other.SUBMIT_JWT_PUBLIC_KEY })).toThrow(/match/i)
    expect(readFileSync(envPath, 'utf8')).toBe(contents)
  })

  it('rejects an invalid configured private key instead of replacing it', () => {
    writeFileSync(envPath, 'AUTH_JWT_PRIVATE_KEY=invalid\n')
    expect(() => ensureLocalAuth(envPath, {})).toThrow(/private key/i)
    expect(readFileSync(envPath, 'utf8')).toBe('AUTH_JWT_PRIVATE_KEY=invalid\n')
  })

  it('saves keys supplied through the environment for Docker Compose to read', () => {
    const otherPath = join(directory, 'other.env')
    ensureLocalAuth(otherPath, {})
    const configured = parse(readFileSync(otherPath, 'utf8'))
    writeFileSync(envPath, 'PORT=5000\nAUTH_JWT_PRIVATE_KEY=\n')
    ensureLocalAuth(envPath, configured)
    expect(parse(readFileSync(envPath, 'utf8'))).toEqual({ PORT: '5000', ...configured })
  })

  it.each(['file', 'environment'])('rejects private material in the public-key field from %s', (source) => {
    ensureLocalAuth(envPath, {})
    const values = parse(readFileSync(envPath, 'utf8'))
    const invalid = { SUBMIT_JWT_PUBLIC_KEY: values.AUTH_JWT_PRIVATE_KEY }
    if (source === 'file') writeFileSync(envPath, `${readFileSync(envPath, 'utf8')}SUBMIT_JWT_PUBLIC_KEY=${values.AUTH_JWT_PRIVATE_KEY}\n`)
    const original = readFileSync(envPath, 'utf8')
    expect(() => ensureLocalAuth(envPath, source === 'environment' ? invalid : {})).toThrow(/public.key.*private/i)
    expect(readFileSync(envPath, 'utf8')).toBe(original)
  })

  it.each(['write', 'rename'])('preserves the original file and removes temporary files after a %s failure', async (operation) => {
    const original = '# settings\nPORT=5000\n'
    writeFileSync(envPath, original, { mode: 0o640 })
    const actual = await vi.importActual('node:fs')
    if (operation === 'write') {
      vi.mocked(writeFileSync).mockImplementationOnce((path, contents, options) => {
        actual.writeFileSync(path, 'partial write', options)
        throw new Error('Simulated disk failure')
      })
    } else {
      vi.mocked(renameSync).mockImplementationOnce(() => { throw new Error('Simulated rename failure') })
    }
    expect(() => ensureLocalAuth(envPath, {})).toThrow(/Simulated/)
    expect(readFileSync(envPath, 'utf8')).toBe(original)
    expect(statSync(envPath).mode & 0o777).toBe(0o640)
    expect(readdirSync(directory)).toEqual(['.env'])
  })
})
