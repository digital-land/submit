import express from 'express'
import nunjucks from 'nunjucks'

const router = express.Router()

router.get('/', (req, res) => {
  const cookiesPage = nunjucks.render('cookies.html', {
    cookiePreferences: req.cookies.cookies_preferences_set,
    showCookieUpdatedMessage: req.cookies.cookies_preferences_set_updated
  })
  res.send(cookiesPage)
})

router.post('/update-preference', (req, res) => {
  const defaultCookieExpiry = 1000 * 60 * 60 * 24 * 365 // 1 year

  res.cookie('cookies_preferences_set', req.body.accept_cookies, { maxAge: defaultCookieExpiry })
  res.cookie('cookies_preferences_set_updated', true, { maxAge: 1000 })
  res.cookie('cookies_policy', JSON.stringify({ essential: true, settings: true, usage: true, campaigns: true }), {
    maxAge: req.body.accept_cookies === 'true' ? defaultCookieExpiry : 0
  })

  res.redirect('/cookies')
})

export default router
