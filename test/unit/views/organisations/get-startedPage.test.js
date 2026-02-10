// getStartedPage.test.js

import { describe, it, expect } from 'vitest'
import { runGenericPageTests } from '../../generic-page.js'
import jsdom from 'jsdom'
import mocker from '../../../utils/mocker.js'
import { OrgGetStarted } from '../../../../src/routes/schemas.js'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

const nunjucks = setupNunjucks({})

const seed = new Date().getTime()

describe(`Get Started Page (seed: ${seed})`, () => {
  const params = mocker(OrgGetStarted, seed)
  const html = nunjucks.render('organisations/get-started.html', params)

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Organisations', href: '/organisations' }, { text: params.organisation.name }, { text: 'Get started' }]
  })

  it('Renders the correct headings', () => {
    expect(document.querySelector('span.govuk-caption-xl').textContent).toEqual(params.organisation.name)
    // Filter returns slug in tests (no mapping loaded), check slug passes through
    expect(document.querySelector('h1').textContent).toContain(params.dataset.dataset)
    expect(document.querySelector('#main-content h2').textContent).toContain(`How to prepare and provide your ${params.dataset.dataset} data`)
  })

  it('Renders breadcrumbs correctly', () => {
    const breadcrumbs = document.querySelectorAll('.govuk-breadcrumbs__list-item')
    expect(breadcrumbs.length).toEqual(4)
    expect(breadcrumbs[0].textContent).toContain('Home')
    expect(breadcrumbs[1].textContent).toContain('Organisations')
    expect(breadcrumbs[2].textContent).toContain(params.organisation.name)
    expect(breadcrumbs[3].textContent).toContain('Get started')
  })
})
