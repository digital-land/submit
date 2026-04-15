import express from 'express'
import nunjucks from 'nunjucks'
import config from '../../config/index.js'
import { MiddlewareError, errorTemplateContext } from '../utils/errors.js'

const router = express.Router()

router.get('/', (req, res) => {
  const cookiesPage = nunjucks.render('cookies.html', {
    cookiePreferences: req.cookies.cookies_preferences_set,
    showCookieUpdatedMessage: req.cookies.cookies_preferences_set_updated
  })
  res.send(cookiesPage)
})

router.post('/update-preference', (req, res) => {
  const acceptCookiesRaw = req.body.accept_cookies
  if (acceptCookiesRaw !== 'true' && acceptCookiesRaw !== 'false') {
    const err = new MiddlewareError('Invalid cookie preference', 400)
    return res.status(err.statusCode).render(err.template, { ...errorTemplateContext(), err })
  }

  const acceptCookies = acceptCookiesRaw === 'true'
  const defaultCookieExpiry = 1000 * 60 * 60 * 24 * 365 // 1 year
  const secureCookie = config.environment !== 'development'
  const cookieOptions = {
    sameSite: 'lax',
    secure: secureCookie
  }

  res.cookie('cookies_preferences_set', String(acceptCookies), { ...cookieOptions, maxAge: defaultCookieExpiry })
  res.cookie('cookies_preferences_set_updated', true, { ...cookieOptions, maxAge: 1000 })
  res.cookie('cookies_policy', JSON.stringify({ essential: true, settings: true, usage: true, campaigns: true }), {
    ...cookieOptions,
    maxAge: acceptCookies ? defaultCookieExpiry : 0
  })

  res.redirect('/cookies')
})

export default router
