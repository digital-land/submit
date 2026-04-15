import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { setupMiddlewares } from '../../../src/serverSetup/middlewares.js'

describe('setupMiddlewares security headers', () => {
  it('adds CSP, frame options and content-type sniffing protection', async () => {
    const app = express()
    setupMiddlewares(app)

    app.get('/__test', (req, res) => {
      res.status(200).send('ok')
    })

    const res = await request(app)
      .get('/__test')
      .expect(200)

    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['x-content-type-options']).toBe('nosniff')

    const csp = res.headers['content-security-policy']
    expect(csp).toBeDefined()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("img-src 'self' data: blob: https:")
    expect(csp).toContain("font-src 'self' data:")
    expect(csp).toContain("connect-src 'self' https:")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("form-action 'self'")
  })
})
