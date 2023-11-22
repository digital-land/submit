import { test } from '@playwright/test'

test('Enter form information', async ({ page }) => {
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
  await fileChooser.setFiles('test/testData/conservation-area-errors.csv')
})

// currently skipping this test as im not sure how to go about providing the pipeline runner api
test('Enter form information and upload a file with errors and without errors', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start now' }).click()

  await page.waitForURL('**/data-subject')

  await page.getByLabel('Conservation area').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/dataset')

  await page.getByLabel('Conservation area dataset').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/upload')

  let fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Upload data').click()
  let fileChooser = await fileChooserPromise
  await fileChooser.setFiles('test/testData/conservation-area-errors.csv')

  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/errors')

  await page.getByRole('button', { name: 'Upload a new version' }).click()

  await page.waitForURL('**/upload')

  fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Upload data').click()
  fileChooser = await fileChooserPromise
  await fileChooser.setFiles('test/testData/conservation-area-ok.csv')

  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/no-errors')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/email-address')
  await page.getByLabel('Your email address').fill('dataOfficer@fakeLPA.com')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/name')
  await page.getByLabel('First name').fill('Bob')
  await page.getByLabel('Last name').fill('Marley')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/lpa')
  await page.getByLabel('Local planning authority').fill('My Fake LPA')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/check')
})
