import { test, expect } from '@playwright/test'

// a playwright test that uploads a file with a missing required column, and checks that the correct error message is displayed
test('when the user uploads a file with a missing required column, the page correctly indicates there\'s an error', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start now' }).click()

  await page.waitForURL('**/dataset')

  await page.getByLabel('Conservation area dataset').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/upload')

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Upload data').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles('test/testData/conservation-area-errors.csv')

  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/errors')

  expect(await page.title()).toBe('Your data has errors - Publish planning and housing data for England')

  expect(await page.textContent('.govuk-list')).toContain('Missing required column reference')
})
