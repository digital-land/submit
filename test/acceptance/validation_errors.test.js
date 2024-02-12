import { test, expect } from '@playwright/test'

// test('when the user clicks continue on the data subject page without entering a data subject, the page correctly indicates there\'s an error', async ({ page }) => {
//   await page.goto('/')
//   await page.getByRole('button', { name: 'Start now' }).click()
//   await page.getByRole('button', { name: 'Continue' }).click()

//   const expectedErrors = [
//     {
//       fieldName: 'input#data-subject.govuk-radios__input',
//       expectedErrorMessage: 'Select a data subject'
//     }
//   ]

//   await testErrorMessage(page, expectedErrors)
// })

test('when the user clicks continue on the how do you want to provide your data page without selecting a method, the page correctly indicates there\'s an error', async ({ page }) => {
  await page.goto('/')
  // start page
  await page.getByRole('button', { name: 'Start now' }).click()
  // dataset page
  await page.getByLabel('Conservation area dataset').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  // upload-method page
  await page.getByRole('button', { name: 'Continue' }).click()

  const expectedErrors = [
    {
      fieldName: 'input#upload-method.govuk-radios__input',
      expectedErrorMessage: 'Select how you want to provide your data'
    }
  ]

  await testErrorMessage(page, expectedErrors)
})

test('when the user clicks continue on the dataset page without entering a dataset, the page correctly indicates there\'s an error', async ({ page }) => {
  await page.goto('/')
  // start page
  await page.getByRole('button', { name: 'Start now' }).click()

  // dataset page
  await page.getByRole('button', { name: 'Continue' }).click()

  const expectedErrors = [
    {
      fieldName: 'input#dataset.govuk-radios__input',
      expectedErrorMessage: 'Select a dataset'
    }
  ]

  await testErrorMessage(page, expectedErrors)
})

test('when the user clicks continue on the file upload page without selecting a file, the page correctly indicates there\'s an error', async ({ page }) => {
  await page.goto('/')
  // start page
  await page.getByRole('button', { name: 'Start now' }).click()

  // // data subject page
  // await page.getByLabel('Conservation area').check()
  // await page.getByRole('button', { name: 'Continue' }).click()

  // dataset page
  await page.getByLabel('Conservation area dataset').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/upload-method')
  await page.getByLabel('File Upload').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  // file upload page
  await page.getByRole('button', { name: 'Continue' }).click()

  const expectedErrors = [
    {
      fieldName: 'input#datafile.govuk-file-upload',
      expectedErrorMessage: 'Select a file'
    }
  ]

  await testErrorMessage(page, expectedErrors)
})

const testErrorMessage = async (page, errors) => {
  for (const { fieldName, expectedErrorMessage } of errors) {
    await page.waitForSelector(fieldName)

    const errorLink = await page.getByRole('link', { name: expectedErrorMessage })
    const fieldError = await page.getByText(`Error: ${expectedErrorMessage}`)
    const errorSummary = await page.getByText('There’s a problem')

    expect(await errorSummary.isVisible(), 'Page should show the error summary').toBeTruthy()
    expect(await errorLink.isVisible(), 'Page should show an error summary that is a link to the problem field').toBeTruthy()
    expect(await fieldError.isVisible(), 'Page should show the error message next to the problem field').toBeTruthy()
    await errorLink.click()
    const problemFieldIsFocused = await page.$eval(fieldName, (el) => el === document.activeElement)
    expect(problemFieldIsFocused, 'The focus should be on the problem field').toBeTruthy()
  }

  expect(await page.title(), 'Page title should indicate there\'s an error').toMatch(/Error: .*/)
}
