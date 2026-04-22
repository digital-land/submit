import { describe, it, expect, vi, beforeEach } from 'vitest'
import config from '../../../config/index.js'

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
      connect: vi.fn().mockResolvedValue(undefined)
    }))
  }
})

vi.mock('connect-redis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({ mocked: true }))
  }
})

describe('setupSession cookie config', () => {
  beforeEach(() => {
    capturedSessionOptions = undefined
    vi.clearAllMocks()
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
