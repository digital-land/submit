import { describe, it } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './generic-page.js'
import config from '../../config/index.js'
import { testValidationErrorMessage } from './validation-tests.js'
import { mockDataSubjects } from './data.js'

const nunjucks = setupNunjucks({ dataSubjects: mockDataSubjects })

describe('Lpa-details View', () => {
  const params = {
    errors: {}
  }
  const htmlNoErrors = nunjucks.render('lpa-details.html', params)

  runGenericPageTests(htmlNoErrors, {
    pageTitle: 'Enter LPA details - Submit planning and housing data for England',
    serviceName: config.serviceName
  })

  describe('validation errors', () => {
    it('should display an error message when the lpa field is empty', () => {
      const params = {
        errors: {
          lpa: {
            type: 'required'
          }
        }
      }

      const html = nunjucks.render('lpa-details.html', params)

      testValidationErrorMessage(html, 'lpa', 'Enter the name of your local planning authority')
    })

    it('should display an error message when the name field is empty', () => {
      const params = {
        errors: {
          name: {
            type: 'required'
          }
        }
      }

      const html = nunjucks.render('lpa-details.html', params)

      testValidationErrorMessage(html, 'name', 'Enter your full name')
    })

    it('should display an error message when the email field is empty', () => {
      const params = {
        errors: {
          email: {
            type: 'required'
          }
        }
      }

      const html = nunjucks.render('lpa-details.html', params)

      testValidationErrorMessage(html, 'email', 'Enter an email address')
    })

    it('should display an error message when the email field is not a valid email', () => {
      const params = {
        errors: {
          email: {
            type: 'email'
          }
        }
      }

      const html = nunjucks.render('lpa-details.html', params)

      testValidationErrorMessage(html, 'email', 'Enter an email address in the correct format')
    })
  })
})
