import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

const renderError = (errorDetail, organisation = {}) => nunjucks.render('check/error-redirect.html', {
  err: {
    message: 'A user-facing message that may change',
    errorDetail,
    ...organisation
  }
})

describe('check error redirect page', () => {
  it('uses the exception type for SSL certificate errors', () => {
    const html = renderError({ exceptionType: 'SSLCertVerificationError' })

    expect(html).toContain('We could not verify the Secure Sockets Layer (SSL) certificate')
  })

  it('renders the dedicated 403 page and LPA overview link', () => {
    const html = renderError({ errCode: '403', contentType: 'text/html' }, {
      organisationId: 'local-authority:ABC',
      organisationName: 'Example Council'
    })

    expect(html).toContain('We cannot access your endpoint URL')
    expect(html).toContain('host the URL on a server that does not block access with set permissions')
    expect(html).toContain('remove any bot protection that blocks automated downloads')
    expect(html).toContain('‘HTTP status code 403’ error')
    expect(html).toContain('digitalland@communities.gov.uk')
    expect(html).toContain('href="/organisations/local-authority%3AABC"')
    expect(html).toContain('Return to Example Council overview')
    expect(html).not.toContain('There’s a problem')
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
