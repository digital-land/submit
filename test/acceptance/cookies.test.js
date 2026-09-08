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

    await expect(page).toHaveTitle('Cookie notice for Check and provide planning and housing data for England - Check and provide planning data')
  })
