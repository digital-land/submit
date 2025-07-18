import { describe, it, expect } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { JSDOM } from 'jsdom'
import { runGenericPageTests } from './generic-page.js'
import mock from '../utils/mocker.js'
import { OrgEndpointError } from '../../src/routes/schemas.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

const dateRegex = /\d{1,2} \w{3,9} \d{4}/g

const seed = new Date().getTime()

describe(`http-error.html(seed: ${seed})`, () => {
  const params = mock(OrgEndpointError, seed)

  const html = nunjucks.render('organisations/http-error.html', params)
  const dom = new JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: `${params.organisation.name} - ${params.dataset.name} - Task list - Check and provide planning data`
  })

  it('Renders the correct heading', () => {
    expect(document.querySelector('#main-content h2').textContent).toContain('Error accessing endpoint URL')
  })

  it('Renders the error details summary list', () => {
    const summaryList = document.querySelector('.govuk-summary-list')
    const rows = [...summaryList.children]

    expect(rows.length).toBe(4)
    expect(rows[0].querySelector('.govuk-summary-list__key').textContent).toContain('Endpoint URL')
    expect(rows[0].querySelector('.govuk-summary-list__value').innerHTML).toContain(params.errorData.endpoint_url)

    expect(rows[1].querySelector('.govuk-summary-list__key').textContent).toContain('HTTP status')
    if (params.errorData.http_status) {
      expect(rows[1].querySelector('.govuk-summary-list__value').textContent).toContain(String(params.errorData.http_status))
    }

    expect(rows[2].querySelector('.govuk-summary-list__key').textContent).toContain('Last attempted access')
    if (params.errorData.latest_log_entry_date) {
      expect(rows[2].querySelector('.govuk-summary-list__value').textContent).toMatch(dateRegex)
    }

    expect(rows[3].querySelector('.govuk-summary-list__key').textContent).toContain('Last successful access')
    if (params.errorData.latest_200_date) {
      expect(rows[3].querySelector('.govuk-summary-list__value').textContent).toMatch(dateRegex)
    }
  })

  it('re-submit link points to get-started page', () => {
    const resubmitLink = document.querySelector('a.resubmit-link')
    expect(resubmitLink.getAttribute('href')).toBe(`/submit/link?dataset=${encodeURIComponent(params.dataset.dataset)}&orgName=${encodeURIComponent(params.organisation.name)}&orgId=${encodeURIComponent(params.organisation.organisation)}`)
  })
})
