import { test, expect } from '@playwright/test'

test('when the user clicks continue on the data subject page without entering a data subject, the page correctly indicates there\'s an error', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForSelector('input#data-subject.govuk-radios__input')

  const errorLink = await page.getByRole('link', { name: 'Please select a data subject' })
  const fieldError = await page.getByText('Error: Please select a data subject')
  const errorSummary = await page.getByText('There is a problem')

  expect(await errorSummary.isVisible(), 'Page should show the error summary').toBeTruthy()
  expect(await errorLink.isVisible(), 'Page should the error message that is a link to the problem field').toBeTruthy()
  expect(await fieldError.isVisible(), 'Page should show the error message next to the problem field').toBeTruthy()
  await errorLink.click()
  const problemFieldIsFocused = await page.$eval('input#data-subject.govuk-radios__input', (el) => el === document.activeElement)
  expect(problemFieldIsFocused, 'The focus should be on the problem field').toBeTruthy()

  expect(await page.title(), 'Page title should indicate there\'s an error').toMatch(/Error: .*/)
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

  const errorLink = await page.getByRole('link', { name: 'Please select a dataset' })
  const fieldError = await page.getByText('Error: Please select a dataset')
  const errorSummary = await page.getByText('There is a problem')

  expect(await errorSummary.isVisible(), 'Page should show the error summary').toBeTruthy()
  expect(await errorLink.isVisible(), 'Page should the error message that is a link to the problem field').toBeTruthy()
  expect(await fieldError.isVisible(), 'Page should show the error message next to the problem field').toBeTruthy()
  await errorLink.click()
  const problemFieldIsFocused = await page.$eval('input#dataset.govuk-radios__input', (el) => el === document.activeElement)
  expect(problemFieldIsFocused, 'The focus should be on the problem field').toBeTruthy()

  expect(await page.title(), 'Page title should indicate there\'s an error').toMatch(/Error: .*/)
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

  const errorLink = await page.getByRole('link', { name: 'Please select a file' })
  const fieldError = await page.getByText('Error: Please select a file')
  const errorSummary = await page.getByText('There is a problem')

  expect(await errorSummary.isVisible(), 'Page should show the error summary').toBeTruthy()
  expect(await errorLink.isVisible(), 'Page should the error message that is a link to the problem field').toBeTruthy()
  expect(await fieldError.isVisible(), 'Page should show the error message next to the problem field').toBeTruthy()
  await errorLink.click()

  const problemFieldIsFocused = await page.$eval('input#datafile.govuk-file-upload', (el) => el === document.activeElement)
  expect(problemFieldIsFocused, 'The focus should be on the problem field').toBeTruthy()

  expect(await page.title(), 'Page title should indicate there\'s an error').toMatch(/Error: .*/)
})
