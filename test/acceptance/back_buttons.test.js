import { test, expect } from '@playwright/test'

test.use({ javaScriptEnabled: false })

test.describe('Back buttons work as expected without js for', () => {
  test('data set page', async ({ page, baseURL }) => {
    await page.goto('/')
    await page.click('text=Start now')
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(baseURL + '/')
  })

  test('upload page', async ({ page, baseURL }) => {
    await page.goto('/')
    await page.click('text=Start now')
    await page.getByLabel('Article 4 direction dataset').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(baseURL + '/dataset')
  })
})
