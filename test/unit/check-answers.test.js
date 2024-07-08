/* eslint-disable prefer-regex-literals */

import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './generic-page.js'
import config from '../../config/index.js'
import { stripWhitespace } from '../utils/stripWhiteSpace.js'
import { mockDataSubjects } from './data.js'

describe('check-answers View', () => {
  const params = {
    values: {
      lpa: 'mockLpa',
      name: 'mockName',
      email: 'mockEmail',
      dataset: 'mockDataset',
      'endpoint-url': 'mockEndpointUrl',
      'documentation-url': 'mockDocumentationUrl',
      hasLicence: 'true'
    }
  }
  const nunjucks = setupNunjucks({ dataSubjects: mockDataSubjects })
  const html = stripWhitespace(nunjucks.render('check-answers.html', params))

  runGenericPageTests(html, {
    pageTitle: 'Check your answers - Check planning and housing data for England',
    serviceName: config.serviceName
  })

  it('should render the lpa selected', () => {
    const lpaRegex = new RegExp('<div class="govuk-summary-list__row">.*Local planning authority.*mockLpa.*Change.*</div>', 'g')
    expect(html).toMatch(lpaRegex)
  })

  it('should render the name entered', () => {
    const nameRegex = new RegExp('<div class="govuk-summary-list__row">.*Full name.*mockName.*Change.*</div>', 'g')
    expect(html).toMatch(nameRegex)
  })

  it('should render the email entered', () => {
    const emailRegex = new RegExp('<div class="govuk-summary-list__row">.*Email address.*mockEmail.*Change.*</div>', 'g')
    expect(html).toMatch(emailRegex)
  })

  it('should render the dataset entered', () => {
    const datasetRegex = new RegExp('<div class="govuk-summary-list__row">.*Dataset.*A Mock dataset.*Change.*</div>', 'g')
    expect(html).toMatch(datasetRegex)
  })

  it('should render the endpoint url entered', () => {
    const endpointUrlRegex = new RegExp('<div class="govuk-summary-list__row">.*Dataset URL.*mockEndpointUrl.*Change.*</div>', 'g')
    expect(html).toMatch(endpointUrlRegex)
  })

  it('should render the documentation url entered', () => {
    const documentationUrlRegex = new RegExp('<div class="govuk-summary-list__row">.*Documentation URL.*mockDocumentationUrl.*Change.*</div>', 'g')
    expect(html).toMatch(documentationUrlRegex)
  })

  it('should render the licence selected as true if the licence has been confirmed', () => {
    const hasLicenceRegex = new RegExp('<div class="govuk-summary-list__row">.*Licence.*True.*Change.*</div>', 'g')
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
    const hasLicenceRegex = new RegExp('<div class="govuk-summary-list__row">.*Licence.*False.*Change.*</div>', 'g')
    expect(html).toMatch(hasLicenceRegex)
  })
})
