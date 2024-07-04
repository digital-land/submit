import { describe, it } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './generic-page.js'
import config from '../../config/index.js'
import { testValidationErrorMessage } from './validation-tests.js'

const nunjucks = setupNunjucks()

describe('choose dataset View', () => {
  const params = {
    errors: {}
  }
  const html = nunjucks.render('choose-dataset.html', params)

  runGenericPageTests(html, {
    pageTitle: `Choose dataset - ${config.serviceName}`,
    serviceName: config.serviceName
  })

  it('should display an error message when the dataset field is empty', () => {
    const params = {
      errors: {
        dataset: {
          type: 'required'
        }
      }
    }

    const html = nunjucks.render('choose-dataset.html', params)

    testValidationErrorMessage(html, 'dataset', 'Select a dataset')
  })
})
