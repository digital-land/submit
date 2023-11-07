import { test } from '@playwright/test'

test('Upload data', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start now' }).click()

  await page.waitForURL('**/data-subject')

  await page.getByLabel('Conservation area').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/dataset')

  await page.getByLabel('Conservation area dataset').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/upload')

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Upload data').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles('test/testData/conservation-area.csv')

  await page.getByRole('button', { name: 'Continue' }).click()

  // this never goes to /errors as the data validator api isn't live. and route mocking seems to only work for the browser instance
  // await page.waitForURL('**/errors')
})
