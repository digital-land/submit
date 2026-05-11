import { test, expect } from '@playwright/test'
import ResultsPage from '../PageObjectModels/resultsPage.js'
import ConfirmationPage from '../PageObjectModels/confirmationPage.js'

test.describe('confirmation page — provide data button visibility', () => {
  test('after a file check the "Provide your data" button is not shown on confirmation', async ({ page }) => {
    const resultsPage = new ResultsPage(page)
    await resultsPage.navigateToRequest('complete')
    await resultsPage.expectPageHasTitle()

    const confirmationPage = await resultsPage.clickContinue()
    await confirmationPage.expectProvideDataButtonHidden()
  })

  test('after a URL check the "Provide your data" button is shown on confirmation', async ({ page }) => {
    const resultsPage = new ResultsPage(page)
    await resultsPage.navigateToRequest('check-url-complete')
    await resultsPage.expectPageHasTitle()

    const confirmationPage = await resultsPage.clickContinue()
    await confirmationPage.expectProvideDataButtonVisible()
  })
})

test.describe('entering via a direct results URL updates the session', () => {
  test('navigating directly to a check_url results page sets upload-method so the provide button appears on confirmation', async ({ page }) => {
    // Simulate someone following a shared /check/results link — no prior session
    await page.goto('/check/results/check-url-complete/1')
    await expect(page).toHaveURL(/\/check\/results\/check-url-complete\/1/)

    await page.goto('/check/confirmation')
    const confirmationPage = new ConfirmationPage(page)
    await confirmationPage.waitForPage()
    await confirmationPage.expectProvideDataButtonVisible()
  })

  test('navigating directly to a check_file results page does not set upload-method', async ({ page }) => {
    await page.goto('/check/results/complete/1')
    await expect(page).toHaveURL(/\/check\/results\/complete\/1/)

    await page.goto('/check/confirmation')
    const confirmationPage = new ConfirmationPage(page)
    await confirmationPage.waitForPage()
    await confirmationPage.expectProvideDataButtonHidden()
  })
})
