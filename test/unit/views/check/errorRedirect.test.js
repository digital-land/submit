import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

const renderError = (errorDetail) => nunjucks.render('check/error-redirect.html', {
  err: {
    message: 'A user-facing message that may change',
    errorDetail
  }
})

describe('check error redirect page', () => {
  it('uses the exception type for SSL certificate errors', () => {
    const html = renderError({ exceptionType: 'SSLCertVerificationError' })

    expect(html).toContain('We could not verify the Secure Sockets Layer (SSL) certificate')
  })

  it('uses the 403 error code for inaccessible URLs', () => {
    const html = renderError({ errCode: '403', contentType: 'text/html' })

    expect(html).toContain("referencing a 'HTTP status code 403' error")
    expect(html).toContain('bot protection, such as Cloudflare or Imperva')
    expect(html).not.toContain('The URL returns a HTML webpage')
  })

  it('uses the content type for HTML responses', () => {
    const html = renderError({ contentType: 'text/html; charset=UTF-8' })

    expect(html).toContain('The URL returns a HTML webpage')
  })

  it('uses the error code and plugin for ArcGIS layer errors', () => {
    const html = renderError({ errCode: '200', plugin: 'arcgis' })

    expect(html).toContain('The URL you have provided is an ArcGIS link, which is not the data layer')
    expect(html).not.toContain('contact support')
  })
})
