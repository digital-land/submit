// getStartedPage.test.js

import { describe, it, expect } from 'vitest'
import { runGenericPageTests } from './sharedTests/generic-page.js'
import jsdom from 'jsdom'
import mocker from '../utils/mocker.js'
import { OrgGetStarted } from '../../src/routes/schemas.js'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'

const nunjucks = setupNunjucks({})

const seed = new Date().getTime()

describe(`Get Started Page (seed: ${seed})`, () => {
  const params = mocker(OrgGetStarted, seed)
  const html = nunjucks.render('organisations/get-started.html', params)

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: `${params.organisation.name} - ${params.dataset.name} - Get started - Submit and update your planning data`
  })

  it('Renders the correct headings', () => {
    expect(document.querySelector('span.govuk-caption-xl').textContent).toEqual(params.organisation.name)
    expect(document.querySelector('h1').textContent).toContain(`${params.dataset.name}`)
    expect(document.querySelector('h2').textContent).toContain(`How to prepare and submit your ${params.dataset.name} data`)
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
