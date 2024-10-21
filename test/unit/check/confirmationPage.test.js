/* eslint-disable prefer-regex-literals */

import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from '../sharedTests/generic-page.js'
import { stripWhitespace } from '../../utils/stripWhiteSpace.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Check confirmation View', () => {
  const params = {
    values: {
      dataset: 'mockDataset'
    }
  }
  const html = stripWhitespace(nunjucks.render('submit/confirmation.html', params))

  runGenericPageTests(html, {
    pageTitle: 'mockDataset submitted - Submit and update your planning data'
  })

  it('should render the gov uk panel', () => {
    const regex = new RegExp('<h1 class="govuk-panel__title".*mockDataset submitted.*</h1>', 'g')
    expect(html).toMatch(regex)
  })
})
