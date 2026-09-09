import { test, expect } from '@playwright/test'

import CookiesPage from '../PageObjectModels/cookiesPage'

test.describe('Cookies page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
  })

  test('has title', async ({ page }) => {
    const cookiesPage = new CookiesPage(page)
    await cookiesPage.navigateHere()

    await expect(page).toHaveTitle('Cookie notice for Check and provide planning and housing data for England - Check and provide planning data')
  })
})
