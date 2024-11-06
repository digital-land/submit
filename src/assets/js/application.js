/*
    This script should contain javascript that will run on all pages
    as it will be loaded into the base nunjucks template.
*/

import CookieBanner from './components/cookie-banner.js'
import initiateJsHiddenChecks from './js-hidden.js'

const initCookieBanner = () => {
  return new CookieBanner(window.document)
}

window.addEventListener('load', () => {
  initiateJsHiddenChecks()
  initCookieBanner()
})
