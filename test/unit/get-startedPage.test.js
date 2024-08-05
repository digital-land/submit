// getStartedPage.test.js

import { describe, it, expect } from 'vitest'
import config from '../../config/index.js'
import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'
import { runGenericPageTests } from './generic-page.js'
import jsdom from 'jsdom'

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
  const params = {
    organisation: {
      name: 'mock org'
    },
    dataset: {
      name: 'World heritage site buffer zone'
    },
    serviceName: config.serviceName
  }
  const html = nunjucks.render('organisations/get-started.html', params)

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: 'mock org - World heritage site buffer zone - Get started - Submit planning and housing data for England',
    serviceName: config.serviceName
  })

  it('Renders the correct headings', () => {
    expect(document.querySelector('span.govuk-caption-xl').textContent).toEqual('mock org')
    expect(document.querySelector('h1').textContent).toContain('World heritage site buffer zone')
    expect(document.querySelector('h2').textContent).toContain('How to prepare and submit your World heritage site buffer zone data')
  })
})
