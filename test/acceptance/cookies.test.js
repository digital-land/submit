import { test, expect } from '@playwright/test'

import CookiesPage from '../PageObjectModels/cookiesPage'
import { beforeEach } from 'node:test'

test.describe('Cookies page', () => {
  beforeEach(async ({ page }) => {
    await page.context().clearCookies()
  })

  test('has title', async ({ page }) => {
    const cookiesPage = new CookiesPage(page)
    await cookiesPage.navigateHere()

    await expect(page).toHaveTitle('Cookie notice for Submit and update planning and housing data for England - Check and submit planning data')
  })

  test('Can find and select the accept cookies radio button and submit the form', async ({ page, context }) => {
    const cookiesPage = new CookiesPage(page)
    await cookiesPage.navigateHere()

    const acceptCookiesRadio = await page.locator('form input[name="accept_cookies"][value="true"]')
    await acceptCookiesRadio.click()
    await page.locator('form').evaluate(form => form.submit())

    await expect(page).toHaveURL(cookiesPage.url)
    await expect(page.locator('.govuk-notification-banner__heading')).toHaveText('You’ve updated your cookie preferences')

    const cookies = await context.cookies()
    const cookiesPreferencesSet = cookies.find(cookie => cookie.name === 'cookies_preferences_set')
    const cookiesPolicy = cookies.find(cookie => cookie.name === 'cookies_policy')

    await expect(cookiesPreferencesSet).toBeDefined()
    await expect(cookiesPreferencesSet.value).toBe('true')
    await expect(cookiesPolicy).toBeDefined()
    await expect(cookiesPolicy.value).toBe(encodeURIComponent('{"essential":true,"settings":true,"usage":true,"campaigns":true}'))
  })

  test('Can reject cookies', async ({ page, context }) => {
    const cookiesPage = new CookiesPage(page)
    await cookiesPage.navigateHere()

    const acceptCookiesRadio = await page.locator('form input[name="accept_cookies"][value="false"]')
    await acceptCookiesRadio.click()
    await page.locator('form').evaluate(form => form.submit())

    await expect(page).toHaveURL(cookiesPage.url)
    await expect(page.locator('.govuk-notification-banner__heading')).toHaveText('You’ve updated your cookie preferences')

    const cookies = await context.cookies()
    const cookiesPreferencesSet = cookies.find(cookie => cookie.name === 'cookies_preferences_set')

    await expect(cookiesPreferencesSet).toBeDefined()
    await expect(cookiesPreferencesSet.value).toBe('false')
  })
})
