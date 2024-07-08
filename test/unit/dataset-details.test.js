/* eslint-disable prefer-regex-literals */

import { describe, expect, it } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './generic-page.js'
import config from '../../config/index.js'
import { stripWhitespace } from '../utils/stripWhiteSpace.js'
import { testValidationErrorMessage } from './validation-tests.js'
import { mockDataSubjects } from './data.js'

const nunjucks = setupNunjucks({ dataSubjects: mockDataSubjects })

function errorTestFn ({
  params,
  fieldId,
  fieldType,
  template = 'dataset-details.html',
  message: expectedMessage
}) {
  return () => {
    const errorParams = {
      values: params.values,
      errors: {
        [fieldId]: {
          type: fieldType
        }
      }
    }

    const html = nunjucks.render(template, errorParams)

    testValidationErrorMessage(html, fieldId, expectedMessage)
  }
}

describe('dataset details View', () => {
  const params = {
    values: {
      dataset: 'mockDataset'
    },
    errors: {}
  }
  const html = stripWhitespace(nunjucks.render('dataset-details.html', params))
  const datasetName = mockDataSubjects.mockDataset.dataSets[0].text
  runGenericPageTests(html, {
    pageTitle: `Enter ${datasetName.toLowerCase()} details - Submit planning and housing data for England`,
    serviceName: config.serviceName
  })

  it('should render the correct header', () => {
    const regex = new RegExp(
      `<h1 class="govuk-heading-l".*${datasetName.toLowerCase()} details.*</h1>`,
      'g'
    )

    expect(html).toMatch(regex)
  })

  describe('validation error messages', () => {
    describe('endpoint-url', () => {
      it(
        'should display an error message when the endpoint-url field is empty',
        errorTestFn({
          params,
          fieldId: 'endpoint-url',
          fieldType: 'required',
          message: 'Enter an endpoint URL'
        })
      )

      it(
        'should display an error message when the endpoint-url is not a valid URL',
        errorTestFn({
          params,
          fieldId: 'endpoint-url',
          fieldType: 'format',
          message: 'Enter a valid endpoint URL'
        })
      )

      it(
        'should display an error message when the endpoint-url is too long',
        errorTestFn({
          params,
          fieldId: 'endpoint-url',
          fieldType: 'maxlength',
          message: 'The URL must be less than 2048 characters'
        })
      )
    })

    describe('documentation-url', () => {
      it(
        'should display an error message when the documentation-url field is empty',
        errorTestFn({
          params,
          fieldId: 'documentation-url',
          fieldType: 'required',
          message: 'Enter a documentation URL'
        })
      )

      it(
        'should display an error message when the documentation-url is not a valid URL',
        errorTestFn({
          params,
          fieldId: 'documentation-url',
          fieldType: 'format',
          message: 'Enter a valid documentation URL'
        })
      )

      it(
        'should display an error message when the documentation-url is too long',
        errorTestFn({
          params,
          fieldId: 'documentation-url',
          fieldType: 'maxlength',
          message: 'The URL must be less than 2048 characters'
        })
      )
    })

    describe('hasLicence', () => {
      it(
        'should display an error message when the hasLicence field is empty',
        errorTestFn({
          params,
          fieldId: 'hasLicence',
          fieldType: 'required',
          message: 'You need to confirm this dataset is provided under the Open Government Licence'
        })
      )
    })
  })
})
