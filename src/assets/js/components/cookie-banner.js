const cookieDefaults = {
  cookieNames: {
    preferenceCookie: 'cookies_preferences_set',
    policyCookie: 'cookies_policy'
  },
  cookieExpiryDays: 365,
  cookiePath: '/',
  defaultPolicyValue: { essential: true, settings: true, usage: true, campaigns: true }
}

export default class CookieBanner {
  constructor (document) {
    this.document = document
    this.banner = this.document.querySelector('.js-app-c-cookie-banner')
    if (!this.banner) {
      console.warn('Cookie banner element not found')
      return
    }

    this.form = this.banner.querySelector('.js-app-c-cookie-banner__form')
    this.confirmationMessage = this.banner.querySelector('.js-app-c-cookie-banner__confirmation')
    this.confirmationDecision = this.banner.querySelector('.js-app-c-cookie-banner__confirmation-decision')
    this.acceptButton = this.banner.querySelector('.js-app-c-cookie-banner__accept')
    this.rejectButton = this.banner.querySelector('.js-app-c-cookie-banner__reject')
    this.hideButton = this.banner.querySelector('.js-app-c-cookie-banner__hide')

    this.init()
  }

  init () {
    if (this.getCookie(cookieDefaults.cookieNames.preferenceCookie) === null) {
      this.showCookieBanner()
    }

    this.acceptButton.addEventListener('click', this.accept.bind(this))
    this.rejectButton.addEventListener('click', this.reject.bind(this))
    this.hideButton.addEventListener('click', this.hideCookieBanner.bind(this))
  }

  accept () {
    this.userCookiePolicyDecision(true)
  }

  reject () {
    this.userCookiePolicyDecision(false)
  }

  userCookiePolicyDecision (userAcceptedCookiePolicy = true) {
    this.setCookie(
      cookieDefaults.cookieNames.preferenceCookie,
      userAcceptedCookiePolicy,
      cookieDefaults.cookieExpiryDays)

    this.setCookie(
      cookieDefaults.cookieNames.policyCookie,
      userAcceptedCookiePolicy ? cookieDefaults.defaultPolicyValue : null,
      userAcceptedCookiePolicy ? cookieDefaults.cookieExpiryDays : 0
    )

    this.showConfirmationMessage(userAcceptedCookiePolicy)
  }

  setCookie (name, value, days) {
    const expires = new Date()
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
    this.document.cookie = `${name}=${JSON.stringify(value)};expires=${expires.toUTCString()};path=${cookieDefaults.cookiePath}`
  }

  getCookie (name) {
    const cookie = this.document.cookie
      .split('; ')
      .find(row => row.startsWith(name))

    return cookie ? JSON.parse(cookie.split('=')[1]) : null
  }

  showConfirmationMessage (userAcceptedCookiePolicy = true) {
    this.form.classList.add('app-c-cookie-banner__form--hidden')
    this.form.setAttribute('aria-hidden', 'true')
    this.acceptButton.removeEventListener('click', this.accept.bind(this))
    this.rejectButton.removeEventListener('click', this.reject.bind(this))

    if (!userAcceptedCookiePolicy) this.confirmationDecision.textContent = 'rejected'
    this.confirmationMessage.classList.remove('app-c-cookie-banner__confirmation--hidden')
    this.confirmationMessage.setAttribute('aria-hidden', 'false')
    this.confirmationMessage.setAttribute('role', 'status') // Announce status to screen readers
  }

  showCookieBanner () {
    if (this.banner) {
      this.banner.classList.remove('js-app-c-cookie-banner--hidden')
      this.banner.removeAttribute('aria-hidden')
    }
  }

  hideCookieBanner () {
    if (this.banner) {
      this.banner.classList.add('js-app-c-cookie-banner--hidden')
      this.banner.setAttribute('aria-hidden', 'true')
    }
  }
}
