/* eslint-disable prefer-regex-literals */
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from '../generic-page.js'
import { stripWhitespace } from '../../utils/stripWhiteSpace.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Check confirmation View', () => {
  const baseOptions = {
    lpa: 'Some Org',
    orgId: 'FOO:BAR',
    dataset: 'some-dataset'
  }

  describe('without requestId', () => {
    const templateParams = { options: baseOptions }
    const html = stripWhitespace(nunjucks.render('check/confirmation.html', templateParams))
    const dom = new JSDOM(html)
    const doc = dom.window.document

    runGenericPageTests(html, {
      pageTitle: 'Publish your data - Check your planning data'
    })

    it('should render the gov uk panel', () => {
      const regex = new RegExp('<h1 class="govuk-panel__title".*Publish your data.*</h1>', 'g')
      expect(html).toMatch(regex)
    })

    it('should not render the submit link when requestId is absent', () => {
      expect(doc.querySelector('a.submit-link')).toBeNull()
    })
  })

  describe('with requestId', () => {
    const templateParams = {
      options: {
        ...baseOptions,
        requestId: 'abc-123'
      }
    }
    const html = stripWhitespace(nunjucks.render('check/confirmation.html', templateParams))
    const dom = new JSDOM(html)
    const doc = dom.window.document

    it('should render a submit link pointing to /submit/lpa-details', () => {
      const submitLink = doc.querySelector('a.submit-link')
      expect(submitLink).not.toBeNull()
      expect(submitLink.getAttribute('href')).toBe('/submit/lpa-details')
    })
  })
})
