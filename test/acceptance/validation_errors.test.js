import { test, expect } from '@playwright/test'

test('when the user clicks continue on the data subject page without entering a data subject, the page correctly indicates there\'s an error', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForSelector('input#data-subject.govuk-radios__input')

  await testErrorMessage(page, 'input#data-subject.govuk-radios__input', 'Please select a data subject')
})

test('when the user clicks continue on the dataset page without entering a dataset, the page correctly indicates there\'s an error', async ({ page }) => {
  await page.goto('/')
  // start page
  await page.getByRole('button', { name: 'Start now' }).click()

  // data subject page
  await page.getByLabel('Conservation area').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  // dataset page
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForSelector('input#dataset.govuk-radios__input')

  await testErrorMessage(page, 'input#dataset.govuk-radios__input', 'Please select a dataset')
})

test('when the user clicks continue on the file upload page without selecting a file, the page correctly indicates there\'s an error', async ({ page }) => {
  await page.goto('/')
  // start page
  await page.getByRole('button', { name: 'Start now' }).click()

  // data subject page
  await page.getByLabel('Conservation area').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  // dataset page
  await page.getByLabel('Conservation area dataset').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  // file upload page
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('input#datafile.govuk-file-upload')

  await testErrorMessage(page, 'input#datafile.govuk-file-upload', 'Please select a file to upload')
})

test('when the user clicks continue on the email page without entering a valid email, the page correctly indicates there\'s an error', async ({ page }) => {
  await page.goto('/')
  // start page
  await page.getByRole('button', { name: 'Start now' }).click()

  // data subject page
  await page.getByLabel('Conservation area').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  // dataset page
  await page.getByLabel('Conservation area dataset').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  // file upload page
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('input#datafile.govuk-file-upload')

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Upload data').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles('test/testData/conservation-area-ok.csv')

  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/no-errors')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/email-address')

  await page.getByRole('button', { name: 'Continue' }).click()

  await testErrorMessage(page, 'input#email-address.govuk-input', 'Please enter a valid email address')

  await page.getByLabel('Your email address').fill('invalidEmail1')
  await page.getByRole('button', { name: 'Continue' }).click()

  await testErrorMessage(page, 'input#email-address.govuk-input', 'Please enter a valid email address')
})

const testErrorMessage = async (page, fieldName, expectedErrorMessage) => {
  const errorLink = await page.getByRole('link', { name: expectedErrorMessage })
  const fieldError = await page.getByText(`Error: ${expectedErrorMessage}`)
  const errorSummary = await page.getByText('There is a problem')

  expect(await errorSummary.isVisible(), 'Page should show the error summary').toBeTruthy()
  expect(await errorLink.isVisible(), 'Page should the error message that is a link to the problem field').toBeTruthy()
  expect(await fieldError.isVisible(), 'Page should show the error message next to the problem field').toBeTruthy()
  await errorLink.click()
  const problemFieldIsFocused = await page.$eval(fieldName, (el) => el === document.activeElement)
  expect(problemFieldIsFocused, 'The focus should be on the problem field').toBeTruthy()

  expect(await page.title(), 'Page title should indicate there\'s an error').toMatch(/Error: .*/)
}
