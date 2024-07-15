import { expect } from 'vitest'
import jsdom from 'jsdom'

export const testValidationErrorMessage = (html, field, errorMessage) => {
  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  const errorSummary = document.querySelector('.govuk-error-summary')
  expect(errorSummary).not.toBeNull()
  expect(errorSummary.textContent).toContain(errorMessage)

  const errorFields = document.querySelectorAll('.govuk-error-message')
  expect(errorFields).not.toBeNull()

  let errorFieldExists = false
  errorFields.forEach((errorField) => {
    if (errorField.textContent.includes(errorMessage)) {
      errorFieldExists = true
    }
  })
  expect(errorFieldExists).toBe(true)
}
