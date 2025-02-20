/* eslint-disable prefer-regex-literals */

import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from '../../generic-page.js'
import { stripWhitespace } from '../../../utils/stripWhiteSpace.js'

describe('check-answers View', async () => {
  const params = {
    values: {
      lpa: 'mockLpa',
      name: 'mockName',
      email: 'mockEmail@example.com',
      dataset: 'mockDataset',
      'endpoint-url': 'mockEndpointUrl',
      'documentation-url': 'mockDocumentationUrl',
      hasLicence: 'true'
    }
  }
  const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })
  const html = stripWhitespace(nunjucks.render('check-answers.html', params))

  runGenericPageTests(html, {
    pageTitle: 'Check your answers - Submit your planning data'
  })

  it('should render the lpa selected', () => {
    const lpaRegex = new RegExp('<div class="govuk-summary-list__row govuk-summary-list__row--no-actions">.*Local planning authority.*mockLpa.*Change.*</div>', 'g')
    expect(html).toMatch(lpaRegex)
  })

  it('should render the name entered', () => {
    const nameRegex = new RegExp('<div class="govuk-summary-list__row">.*Full name.*mockName.*Change.*</div>', 'g')
    expect(html).toMatch(nameRegex)
  })

  it('should render the email entered', () => {
    const emailRegex = new RegExp('<div class="govuk-summary-list__row">.*Email address.*mockEmail.*</div>', 'g')
    expect(html).toMatch(emailRegex)
  })

  it('should render the dataset entered', () => {
    const datasetRegex = new RegExp('<div class="govuk-summary-list__row govuk-summary-list__row--no-actions">.*Dataset.*mockDataset.*</div>', 'g')
    expect(html).toMatch(datasetRegex)
  })

  it('should render the endpoint url entered', () => {
    const endpointUrlRegex = new RegExp('<div class="govuk-summary-list__row">.*Endpoint URL.*mockEndpointUrl.*Change.*</div>', 'g')
    expect(html).toMatch(endpointUrlRegex)
  })

  it('should render the documentation url entered', () => {
    const documentationUrlRegex = new RegExp('<div class="govuk-summary-list__row">.*Webpage URL.*mockDocumentationUrl.*Change.*</div>', 'g')
    expect(html).toMatch(documentationUrlRegex)
  })

  it('should render the licence selected as true if the licence has been confirmed', () => {
    const hasLicenceRegex = new RegExp('<div class="govuk-summary-list__row">.*Licence.*Yes.*Change.*</div>', 'g')
    expect(html).toMatch(hasLicenceRegex)
  })

  it('should render the licence selected as false if the licence has not been confirmed', () => {
    const noLicenseParams = {
      values: {
        ...params.values,
        hasLicence: 'false'
      }
    }
    const html = stripWhitespace(nunjucks.render('check-answers.html', noLicenseParams))

    const hasLicenceRegex = new RegExp('<div class="govuk-summary-list__row">.*Licence.*No.*Change.*</div>', 'g')
    expect(html).toMatch(hasLicenceRegex)
  })
})
