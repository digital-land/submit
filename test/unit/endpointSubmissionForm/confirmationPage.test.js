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
})
