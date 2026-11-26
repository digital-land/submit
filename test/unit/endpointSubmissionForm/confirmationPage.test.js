/* eslint-disable prefer-regex-literals */

import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from '../generic-page.js'
import { stripWhitespace } from '../../utils/stripWhiteSpace.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Submit confirmation View', () => {
  const params = {
    values: {
      dataset: 'mockDataset',
      email: 'email@example.com'
    }
  }
  const html = stripWhitespace(nunjucks.render('submit/confirmation.html', params))

  runGenericPageTests(html, {
    pageTitle: 'mockDataset provided - Check and provide your planning data'
  })

  it('should render the gov uk panel', () => {
    const regex = new RegExp('<h1 class="govuk-panel__title".*mockDataset provided.*</h1>', 'g')
    expect(html).toMatch(regex)
  })

  it('should contain the submitter email', () => {
    expect(html).toMatch(/email&#64;example.com/)
  })

  it.each(['signedInEmail', 'email'])('escapes HTML in %s', field => {
    const email = '<img src=x onerror=alert(1)>@council.gov.uk'
    // Include request locals as Express does, outside the wizard value schema.
    const html = nunjucks.renderString('{% include "submit/confirmation.html" %}', {
      ...params,
      signedInEmail: field === 'signedInEmail' ? email : undefined,
      values: { ...params.values, email }
    })
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;&#64;council.gov.uk')
  })
})

it('shows all Jira references for a multiple-plan submission', () => {
  const html = stripWhitespace(nunjucks.render('submit/confirmation.html', {
    values: {
      dataset: 'local-plan',
      email: 'email@example.com',
      reference: 'PLAN-1, PLAN-2',
      references: ['PLAN-1', 'PLAN-2']
    }
  }))
  expect(html).toContain('Your reference numbers')
  expect(html).toContain('PLAN-1, PLAN-2')
})
