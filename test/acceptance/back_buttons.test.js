import { test, expect } from '@playwright/test'

test.use({ javaScriptEnabled: false })

test.describe('Back buttons work as expected without js for', () => {
  test('data subject page', async ({ page, baseURL }) => {
    await page.goto('/')
    await page.click('text=Start now')
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(baseURL + '/')
  })

  test('dataset page', async ({ page, baseURL }) => {
    await page.goto('/')
    await page.click('text=Start now')
    await page.getByLabel('Conservation area').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(baseURL + '/data-subject')
  })

  test('upload page', async ({ page, baseURL }) => {
    await page.goto('/')
    await page.click('text=Start now')
    await page.getByLabel('Conservation area').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Conservation area dataset').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    expect(page.url()).toBe(baseURL + '/dataset')
  })
})
