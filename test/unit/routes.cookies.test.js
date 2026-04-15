import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import cookieRouter from '../../src/routes/cookies.js'
import config from '../../config/index.js'

describe('cookies route', () => {
  const buildApp = () => {
    const app = express()

    // Prevent template lookup in tests for error responses.
    app.use((req, res, next) => {
      res.render = (_template, _locals) => res.send('error')
      next()
    })

    app.use(express.urlencoded({ extended: true }))
    app.use('/cookies', cookieRouter)
    return app
  }

  it('sets expected cookies and redirects when preference is valid', async () => {
    const app = buildApp()

    const res = await request(app)
      .post('/cookies/update-preference')
      .type('form')
      .send({ accept_cookies: 'true' })
      .expect(302)

    expect(res.headers.location).toBe('/cookies')

    const setCookie = res.headers['set-cookie'] || []
    expect(setCookie.some(cookie => cookie.startsWith('cookies_preferences_set='))).toBe(true)
    expect(setCookie.some(cookie => cookie.startsWith('cookies_preferences_set_updated='))).toBe(true)
    expect(setCookie.some(cookie => cookie.startsWith('cookies_policy='))).toBe(true)

    // sameSite is part of hardening and should be on all cookies emitted by this route.
    expect(setCookie.every(cookie => cookie.includes('SameSite=Lax'))).toBe(true)

    const shouldBeSecure = config.environment !== 'development'
    if (shouldBeSecure) {
      expect(setCookie.every(cookie => cookie.includes('Secure'))).toBe(true)
    } else {
      expect(setCookie.some(cookie => cookie.includes('Secure'))).toBe(false)
    }
  })

  it('returns 400 when cookie preference is invalid', async () => {
    const app = buildApp()

    await request(app)
      .post('/cookies/update-preference')
      .type('form')
      .send({ accept_cookies: 'maybe' })
      .expect(400)
  })
})
