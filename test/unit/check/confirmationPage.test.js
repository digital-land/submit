/* eslint-disable prefer-regex-literals */
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from '../generic-page.js'
import { stripWhitespace } from '../../utils/stripWhiteSpace.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Check confirmation View', () => {
  const templateParams = {
    options: {
      lpa: 'Some Org',
      orgId: 'FOO:BAR',
      dataset: 'some-dataset'
    }
  }
  const html = stripWhitespace(nunjucks.render('check/confirmation.html', templateParams))
  const dom = new JSDOM(html)
  const doc = dom.window.document

  runGenericPageTests(html, {
    pageTitle: 'You can now publish your data - Check your planning data'
  })

  it('should render the gov uk panel', () => {
    const regex = new RegExp('<h1 class="govuk-panel__title".*You can now publish your data.*</h1>', 'g')
    expect(html).toMatch(regex)
  })

  it('check tool deep link contains correct search params', () => {
    const submitLink = doc.querySelector('a.submit-link')
    const deepLink = new URL(`http://example.com${submitLink.getAttribute('href')}`)
    const searchParams = deepLink.searchParams
    expect(searchParams.get('orgId')).toBe(templateParams.options.orgId)
    expect(searchParams.get('orgName')).toBe(templateParams.options.lpa)
    expect(searchParams.get('dataset')).toBe(templateParams.options.dataset)
  })
})
