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

  it(' Renders the correct heading', () => {
    expect(document.querySelector('h1').textContent).toContain('Get started with submitting your data')
  })

  it('Renders the correct step-by-step navigation', () => {
    const stepNav = document.querySelector('.gem-c-step-nav')
    expect(stepNav).not.toBeNull()
    const steps = stepNav.querySelectorAll('.gem-c-step-nav__step')
    expect(steps.length).toEqual(5) // 5 steps in the navigation

    steps.forEach((step, i) => {
      const expectedStepTitle = [
        'Prepare your data',
        'Create a data endpoint',
        'Test your data',
        'Submit your data',
        'Update your data'
      ][i]

      expect(step.querySelector('.js-step-title').textContent).toContain(expectedStepTitle)
    })
  })

  it('Renders the correct step content', () => {
    const stepPanels = document.querySelectorAll('.gem-c-step-nav__panel')
    expect(stepPanels.length).toEqual(5) // 5 step panels

    stepPanels.forEach((stepPanel, i) => {
      const expectedStepContent = [
        'Prepare your data by following our guidance on data format and schema.',
        'Create a data endpoint where we can access your data.',
        'Test your data to ensure it meets our requirements.',
        'Submit your data using our submission service.',
        'Update your data regularly to ensure it remains accurate and up-to-date.'
      ][i]

      expect(stepPanel.querySelector('.gem-c-step-nav__paragraph').textContent).toContain(expectedStepContent)
    })
  })
})
