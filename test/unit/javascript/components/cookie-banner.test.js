import CookieBanner from '../../../../src/assets/js/components/cookie-banner'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks'
import { describe, expect, it } from 'vitest'
import { spyOn } from '@vitest/spy'
import jsdom from 'jsdom'

describe('Cookie banner component', () => {
  const htmlString = '{% include "components/cookie-banner.html" %}'
  const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })
  const html = nunjucks.renderString(htmlString, { serviceType: 'Manage' })
  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  it('Renders the cookie banner correctly', () => {
    const header = document.querySelector('.govuk-cookie-banner__heading')
    const acceptButton = document.querySelector('.js-app-c-cookie-banner__accept')
    const rejectButton = document.querySelector('.js-app-c-cookie-banner__reject')
    const viewCookieLink = document.querySelector('.govuk-button-group .govuk-link')

    expect(header.textContent.trim()).toEqual('Cookies on Submit and update your planning data')
    expect(acceptButton.textContent.trim()).toEqual('Accept analytics cookies')
    expect(rejectButton.textContent.trim()).toEqual('Reject analytics cookies')
    expect(viewCookieLink.textContent.trim()).toEqual('View cookies')
    expect(viewCookieLink.href).toEqual('/cookies')
  })

  it('Initializes the CookieBanner class correctly', () => {
    const cookieBanner = new CookieBanner(document)
    expect(cookieBanner.banner).not.toBeNull()
    expect(cookieBanner.form).not.toBeNull()
    expect(cookieBanner.confirmationMessage).not.toBeNull()
    expect(cookieBanner.confirmationDecision).not.toBeNull()
    expect(cookieBanner.acceptButton).not.toBeNull()
    expect(cookieBanner.rejectButton).not.toBeNull()
    expect(cookieBanner.hideButton).not.toBeNull()
  })

  it('Accept button sets cookies and shows confirmation message', () => {
    const cookieBanner = new CookieBanner(document)
    const setCookieSpy = spyOn(cookieBanner, 'setCookie')

    cookieBanner.acceptButton.click()

    expect(setCookieSpy).toBeCalledWith('cookies_preferences_set', true, 365)
    expect(setCookieSpy).toBeCalledWith('cookies_policy', { essential: true, settings: true, usage: true, campaigns: true }, 365)
    expect(cookieBanner.confirmationMessage.classList.contains('app-c-cookie-banner__confirmation--hidden')).toBe(false)
  })

  it('Reject button sets cookies and shows confirmation message', () => {
    const cookieBanner = new CookieBanner(document)
    const setCookieSpy = spyOn(cookieBanner, 'setCookie')

    cookieBanner.rejectButton.click()

    expect(setCookieSpy).toBeCalledWith('cookies_preferences_set', false, 365)
    expect(setCookieSpy).toBeCalledWith('cookies_policy', null, 0)
    expect(cookieBanner.confirmationMessage.classList.contains('app-c-cookie-banner__confirmation--hidden')).toBe(false)
  })

  it('Initializes the CookieBanner class correctly', () => {
    const cookieBanner = new CookieBanner(document)
    expect(cookieBanner.banner).toBeTruthy()
    expect(cookieBanner.form).toBeTruthy()
    expect(cookieBanner.confirmationMessage).toBeTruthy()
    expect(cookieBanner.confirmationDecision).toBeTruthy()
    expect(cookieBanner.acceptButton).toBeTruthy()
    expect(cookieBanner.rejectButton).toBeTruthy()
    expect(cookieBanner.hideButton).toBeTruthy()
  })

  it('Hide button hides the cookie banner', () => {
    const cookieBanner = new CookieBanner(document)
    cookieBanner.hideButton.click()
    expect(cookieBanner.banner.classList.contains('js-app-c-cookie-banner--hidden')).toBe(true)
    expect(cookieBanner.banner.getAttribute('aria-hidden')).toBe('true')
  })
})
