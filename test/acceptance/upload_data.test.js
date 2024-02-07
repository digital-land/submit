import { test, expect } from '@playwright/test'

test('Enter form information', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start now' }).click()

  // await page.waitForURL('**/data-subject')

  // await page.getByLabel('Conservation area').check()
  // await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/dataset')

  expect(await page.title()).toBe('Dataset - Publish planning and housing data for England')

  await page.getByLabel('Conservation area dataset').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/upload')
  expect(await page.title()).toBe('Upload data - Publish planning and housing data for England')

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Upload data').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles('test/testData/conservation-area-errors.csv')
})

// currently skipping this test as im not sure how to go about providing the pipeline runner api
test('Enter form information and upload a file with errors and without errors', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start now' }).click()

  // await page.waitForURL('**/data-subject')

  // await page.getByLabel('Conservation area').check()
  // await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/howDoYouWantToProvideData')
  await page.getByLabel('File Upload').check()
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

  expect(await page.title()).toBe('Your data has errors - Publish planning and housing data for England')

  await page.getByRole('button', { name: 'Upload a new version' }).click()

  await page.waitForURL('**/upload')

  fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Upload data').click()
  fileChooser = await fileChooserPromise
  await fileChooser.setFiles('test/testData/conservation-area-ok.csv')

  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/no-errors')
  expect(await page.title()).toBe('Your data has been checked and can be published - Publish planning and housing data for England')

  await page.getByRole('button', { name: 'Continue' }).click()

  // await page.waitForURL('**/email-address')
  // await page.getByLabel('Your email address').fill('dataOfficer@fakeLPA.com')
  // await page.getByRole('button', { name: 'Continue' }).click()

  // await page.waitForURL('**/name')
  // await page.getByLabel('First name').fill('Bob')
  // await page.getByLabel('Last name').fill('Marley')
  // await page.getByRole('button', { name: 'Continue' }).click()

  // await page.waitForURL('**/lpa')
  // await page.getByLabel('Local planning authority').fill('My Fake LPA')
  // await page.getByRole('button', { name: 'Continue' }).click()

  // await page.waitForURL('**/check')
  // expect(await page.getByText('Conservation area', { exact: true }).isVisible(), 'supplied data subject not on check page').toBeTruthy()
  // expect(await page.getByText('conservation-area', { exact: true }).isVisible(), 'supplied dataset not on check page').toBeTruthy()
  // expect(await page.getByText('dataOfficer@fakeLPA.com').isVisible(), 'supplied email not on check page').toBeTruthy()
  // expect(await page.getByText('Bob Marley').isVisible(), 'supplied name not on check page').toBeTruthy()
  // expect(await page.getByText('My Fake LPA').isVisible(), 'supplied email not on check page').toBeTruthy()
  // await page.getByRole('button', { name: 'Send data' }).click()

  await page.waitForURL('**/confirmation')
})

test('Enter form information and specify a URL without errors', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start now' }).click()

  // await page.waitForURL('**/data-subject')

  // await page.getByLabel('Conservation area').check()
  // await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/howDoYouWantToProvideData')

  await page.getByLabel('URL').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/dataset')

  await page.getByLabel('Conservation area dataset').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/upload')

  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/no-errors')
  expect(await page.title()).toBe('Your data has been checked and can be published - Publish planning and housing data for England')

  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/confirmation')
})