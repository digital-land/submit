import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import config from '../../../config/index.js'
import { createClient } from 'redis'

let capturedSessionOptions

vi.mock('express-session', () => {
  const session = vi.fn((options) => {
    capturedSessionOptions = options
    return (req, res, next) => next()
  })

  session.MemoryStore = vi.fn()
  return { default: session }
})

vi.mock('redis', () => {
  return {
    createClient: vi.fn(() => ({
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined)
    }))
  }
})

vi.mock('connect-redis', () => {
  return {
    default: vi.fn().mockImplementation(function () { return { mocked: true } })
  }
})

describe('setupSession cookie config', () => {
  afterEach(() => vi.unstubAllEnvs())
  beforeEach(() => {
    capturedSessionOptions = undefined
    vi.clearAllMocks()
  })

  it('requires a session secret in deployed environments', async () => {
    const original = config.environment
    config.environment = 'production'
    vi.stubEnv('SESSION_SECRET', '')
    try {
      const { setupSession } = await import('../../../src/serverSetup/session.js')
      await expect(setupSession({ use: vi.fn() })).rejects.toThrow(/SESSION_SECRET/)
    } finally { config.environment = original }
  })

  it('fails startup if configured Redis cannot connect', async () => {
    const original = config.redis
    config.redis = { host: 'localhost', port: 6379, secure: false }
    createClient.mockReturnValueOnce({ on: vi.fn(), connect: vi.fn().mockRejectedValue(new Error('unavailable')) })
    try {
      const { setupSession } = await import('../../../src/serverSetup/session.js')
      await expect(setupSession({ use: vi.fn() })).rejects.toThrow('unavailable')
    } finally { config.redis = original }
  })

  it('keeps reconnecting after an established Redis connection is lost', async () => {
    const original = config.redis
    config.redis = { host: 'localhost', port: 6379, secure: false }
    const on = vi.fn()
    createClient.mockReturnValueOnce({ on, connect: vi.fn().mockResolvedValue(undefined) })
    try {
      const { setupSession } = await import('../../../src/serverSetup/session.js')
      await setupSession({ use: vi.fn() })
      const options = createClient.mock.lastCall[0]
      expect(options.disableOfflineQueue).toBe(true)
      expect(options.socket.reconnectStrategy(4)).toBe(false)
      on.mock.calls.find(([name]) => name === 'ready')?.[1]()
      expect(options.socket.reconnectStrategy(4)).toBeGreaterThan(0)
    } finally { config.redis = original }
  })

  it('configures secure, httpOnly and sameSite flags on session cookie', async () => {
    const { setupSession } = await import('../../../src/serverSetup/session.js')
    const app = { use: vi.fn() }

    await setupSession(app)

    expect(app.use).toHaveBeenCalledTimes(1)
    expect(capturedSessionOptions).toBeDefined()
    expect(capturedSessionOptions.cookie.httpOnly).toBe(true)
    expect(capturedSessionOptions.cookie.sameSite).toBe('lax')
    expect(capturedSessionOptions.cookie.secure).toBe(config.secureCookies)
  })
})
