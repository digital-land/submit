// this file holds unit tests that apply to all pages

import { it, expect } from 'vitest'
import jsdom from 'jsdom'

/*
    Params:
        html: string
        options: {
            pageTitle: string,
            serviceName: string
        }
*/
export const runGenericPageTests = (html, options) => {
  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  it('should have the correct header', () => {
    const govLogo = document.querySelector('.govuk-header__logo')

    expect(govLogo).not.toBeNull()

    const govLogoSvg = govLogo.querySelector('svg')

    expect(govLogoSvg).not.toBeNull()
    expect(govLogoSvg.getAttribute('aria-label')).toBe('GOV.UK')
  })

  if (options.pageTitle) {
    it('should have the correct title', () => {
      expect(document.title).toBe(options.pageTitle)
    })
  }
}
