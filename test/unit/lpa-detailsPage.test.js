import { describe, it } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './sharedTests/generic-page.js'
import { testValidationErrorMessage } from './validation-tests.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Lpa-details View', () => {
  const params = {
    errors: {}
  }
  const htmlNoErrors = nunjucks.render('lpa-details.html', params)

  runGenericPageTests(htmlNoErrors, {
    pageTitle: 'Enter LPA details - Submit and update your planning data'
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
