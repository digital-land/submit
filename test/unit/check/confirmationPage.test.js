/* eslint-disable prefer-regex-literals */

import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from '../generic-page.js'
import { stripWhitespace } from '../../utils/stripWhiteSpace.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Check confirmation View', () => {
  const params = {}
  const html = stripWhitespace(nunjucks.render('check/confirmation.html', params))

  runGenericPageTests(html, {
    pageTitle: 'You can now publish your data - Check your planning data'
  })

  it('should render the gov uk panel', () => {
    const regex = new RegExp('<h1 class="govuk-panel__title".*You can now publish your data.*</h1>', 'g')
    expect(html).toMatch(regex)
  })
})
