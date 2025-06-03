import { describe, it, expect } from 'vitest'
import jsdom from 'jsdom'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

describe('Cookie banner component', () => {
  const htmlString = '{% include "components/cookie-banner.html" %}'
  const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })
  const html = nunjucks.renderString(htmlString, { serviceType: 'manage' })
  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  it('Renders the cookie banner correctly', () => {
    const header = document.querySelector('.govuk-cookie-banner__heading')
    const acceptButton = document.querySelector('.js-app-c-cookie-banner__accept')
    const rejectButton = document.querySelector('.js-app-c-cookie-banner__reject')
    const viewCookieLink = document.querySelector('.govuk-button-group .govuk-link')

    expect(header.textContent.trim()).toEqual('Cookies on Check and submit planning data')
    expect(acceptButton.textContent.trim()).toEqual('Accept analytics cookies')
    expect(rejectButton.textContent.trim()).toEqual('Reject analytics cookies')
    expect(viewCookieLink.textContent.trim()).toEqual('View cookies')
    expect(viewCookieLink.href).toEqual('/cookies')
  })
})
