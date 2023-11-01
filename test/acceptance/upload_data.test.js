import { test, expect } from '@playwright/test'

test.skip('Upload data', async ({ page }) => {
  test('Upload data', async ({ page }) => {
    await page.goto('/start')
    await page.getByRole('button', { name: 'Start now' }).click()

    await page.waitForURL('**/data-subject')

    await page.getByLabel('Conservation area').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.waitForURL('**/dataset')

    await page.getByLabel('Conservation area dataset').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.waitForURL('**/upload')

    await page.getByLabel('Upload data').click()
    await page.getByLabel('Upload data').setInputFiles('test/testData/conservation-area.csv')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.waitForURL('**/submit')

    const ListedDataSubject = await page.getByText('data-subject: Conservation area')
    await expect(ListedDataSubject !== undefined).toBeTruthy()

    const ListedDataset = await page.getByText('dataset: Conservation area dataset')
    await expect(ListedDataset !== undefined).toBeTruthy()

    const ListedDatafile = await page.getByText('datafile: conservation-area.csv')
    await expect(ListedDatafile !== undefined).toBeTruthy()
  })
})
