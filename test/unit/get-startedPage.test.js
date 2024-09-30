// getStartedPage.test.js

import { describe, it, expect } from 'vitest'
import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'
import { runGenericPageTests } from './generic-page.js'
import jsdom from 'jsdom'
import mocker from '../utils/mocker.js'
import { OrgGetStarted } from '../../src/routes/schemas.js'

const nunjucksEnv = nunjucks.configure([
  'src/views',
  'src/views/check',
  'src/views/submit',
  'node_modules/govuk-frontend/dist/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], {
  dev: true,
  noCache: true,
  watch: true
})

const datasetNameMapping = new Map([
  ['article-4-direction', 'Article 4 Direction'],
  ['article-4-direction-area', 'Article 4 Direction Area']
  // ...
])

addFilters(nunjucksEnv, { datasetNameMapping })

describe('Get Started Page', () => {
  const params = mocker(OrgGetStarted)
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
