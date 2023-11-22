import { test, expect } from '@playwright/test'

test('when the user clicks continue on the data subject page without entering a data subject, the page correctly indicates there\'s an error', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  const expectedErrors = [
    {
      fieldName: 'input#data-subject.govuk-radios__input',
      expectedErrorMessage: 'Please select a data subject'
    }
  ]

  await testErrorMessage(page, expectedErrors)
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

  const expectedErrors = [
    {
      fieldName: 'input#dataset.govuk-radios__input',
      expectedErrorMessage: 'Please select a dataset'
    }
  ]

  await testErrorMessage(page, expectedErrors)
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

  const expectedErrors = [
    {
      fieldName: 'input#datafile.govuk-file-upload',
      expectedErrorMessage: 'Please select a file'
    }
  ]

  await testErrorMessage(page, expectedErrors)
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

  let expectedErrors = [
    {
      fieldName: 'input#email-address.govuk-input',
      expectedErrorMessage: 'Enter an email address'
    }
  ]

  await testErrorMessage(page, expectedErrors)

  await page.getByLabel('Your email address').fill('invalidEmail1')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForSelector('input#email-address.govuk-input')

  expectedErrors = [
    {
      fieldName: 'input#email-address.govuk-input',
      expectedErrorMessage: 'Enter an email address in the correct format'
    }
  ]

  await testErrorMessage(page, expectedErrors)
})

test('when the user clicks continue on the name page without correctly completing the form, the page correctly indicates there\'s an error', async ({ page }) => {
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

  await page.getByLabel('Your email address').fill('test@mail.com')

  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/name')

  await page.getByRole('button', { name: 'Continue' }).click()

  const expectedErrors = [
    {
      fieldName: 'input#first-name.govuk-input',
      expectedErrorMessage: 'Enter your first name'
    },
    {
      fieldName: 'input#last-name.govuk-input',
      expectedErrorMessage: 'Enter your last name'
    }
  ]

  await testErrorMessage(page, expectedErrors)
})

const testErrorMessage = async (page, errors) => {
  for (const { fieldName, expectedErrorMessage } of errors) {
    await page.waitForSelector(fieldName)

    const errorLink = await page.getByRole('link', { name: expectedErrorMessage })
    const fieldError = await page.getByText(`Error: ${expectedErrorMessage}`)
    const errorSummary = await page.getByText('There is a problem')

    expect(await errorSummary.isVisible(), 'Page should show the error summary').toBeTruthy()
    expect(await errorLink.isVisible(), 'Page should show an error summary that is a link to the problem field').toBeTruthy()
    expect(await fieldError.isVisible(), 'Page should show the error message next to the problem field').toBeTruthy()
    await errorLink.click()
    const problemFieldIsFocused = await page.$eval(fieldName, (el) => el === document.activeElement)
    expect(problemFieldIsFocused, 'The focus should be on the problem field').toBeTruthy()
  }

  expect(await page.title(), 'Page title should indicate there\'s an error').toMatch(/Error: .*/)
}
