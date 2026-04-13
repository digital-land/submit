import { describe, it, expect } from 'vitest'
import jsdom from 'jsdom'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

describe('Download button component', () => {
  const htmlString = '{% from "components/download-button.html" import downloadButton %}{{ downloadButton(buttonOptions) }}'
  const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })
  const html = nunjucks.renderString(htmlString, {
    buttonOptions: {
      text: 'Download alternative source data (CSV)',
      href: '/downloads/alternative.csv',
      preventDoubleClick: true
    }
  })
  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  it('renders anchor button markup', () => {
    const wrapper = document.querySelector('.js-app-c-download-button')
    const button = wrapper.querySelector('.govuk-button')

    expect(wrapper).not.toBeNull()
    expect(button).not.toBeNull()
    expect(button.tagName).toEqual('A')
    expect(button.textContent.trim()).toEqual('Download alternative source data (CSV)')
    expect(button.getAttribute('href')).toEqual('/downloads/alternative.csv')
  })
})
