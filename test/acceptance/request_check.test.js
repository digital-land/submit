/*
    this file will hold acceptance tests for requesting checks
    the acceptance criteria we are basing these tests on are:
        - request check of a datafile with javascript enabled
        - request check of a datafile with javascript disabled
        - request check of a datafile when javascript fails
*/

import { test } from '@playwright/test'
import UploadMethodPage, { uploadMethods } from '../PageObjectModels/uploadMethodPage'

test.setTimeout(300000)

const navigateToCheck = async (page) => {
  await page.goto('/check/link?dataset=article-4-direction&orgName=Adur%20District%20Council&orgId=local-authority%3AADU')
  return new UploadMethodPage(page)
}

test.describe('Request Check', () => {
  test.describe('with javascript enabled', () => {
    test('request check of a @datafile', async ({ page }) => {
      const uploadMethodPage = await navigateToCheck(page)

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.File)
      const uploadFilePage = await uploadMethodPage.clickContinue()

      await uploadFilePage.waitForPage()
      await uploadFilePage.uploadFile('test/datafiles/article4directionareas-ok.csv')
      const statusPage = await uploadFilePage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectPageToHaveFinishedProcessing()
      const id = await statusPage.getIdFromUrl()
      const resultsPage = await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTabs()

      const confirmationPage = await resultsPage.clickContinue()
      await confirmationPage.waitForPage()
    })

    test('request check of an error @datafile', async ({ page }) => {
      const uploadMethodPage = await navigateToCheck(page)

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.File)
      const uploadFilePage = await uploadMethodPage.clickContinue()

      await uploadFilePage.waitForPage()
      await uploadFilePage.uploadFile('test/datafiles/article4directionareas-error.csv')
      const statusPage = await uploadFilePage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectPageToHaveFinishedProcessing()
      const id = await statusPage.getIdFromUrl()
      const resultsPage = await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()

      await resultsPage.expectPageHasTableAndSummary()
      await resultsPage.expectPageHasTabs()
    })

    test('request check of a @url', async ({ page }) => {
      const uploadMethodPage = await navigateToCheck(page)

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      const submitURLPage = await uploadMethodPage.clickContinue()

      await submitURLPage.waitForPage()
      await submitURLPage.enterURL('https://raw.githubusercontent.com/digital-land/lpa-data-validator-frontend/main/test/datafiles/article4directionareas-ok.csv')
      const statusPage = await submitURLPage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectPageToHaveFinishedProcessing()
      const id = await statusPage.getIdFromUrl()
      const resultsPage = await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTabs()
    })

    test('request check of an error @url', async ({ page }) => {
      const uploadMethodPage = await navigateToCheck(page)

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      const submitURLPage = await uploadMethodPage.clickContinue()

      await submitURLPage.waitForPage()
      await submitURLPage.enterURL('https://raw.githubusercontent.com/digital-land/lpa-data-validator-frontend/pagination_acceptance_tests/test/datafiles/article4directionareas-error.csv')
      const statusPage = await submitURLPage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectPageToHaveFinishedProcessing()
      const id = await statusPage.getIdFromUrl()
      const resultsPage = await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTableAndSummary()
      await resultsPage.expectPageHasTabs()
    })
  })

  test.describe('With javascript disabled', () => {
    test.use({ javaScriptEnabled: false })

    test('request check of a @datafile', async ({ page }) => {
      const uploadMethodPage = await navigateToCheck(page)

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.File)
      const uploadFilePage = await uploadMethodPage.clickContinue()

      await uploadFilePage.waitForPage()
      await uploadFilePage.uploadFile('test/datafiles/article4directionareas-ok.csv')
      const statusPage = await uploadFilePage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectCheckStatusButtonToBeVisible()
      const id = await statusPage.getIdFromUrl()

      await page.waitForTimeout(5000) // wait for 5 seconds for processing. could be smarter about this so we dont have to wait for the timeout to expire.

      const resultsPage = await statusPage.clickCheckStatusButton()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTabs(false)

      const confirmationPage = await resultsPage.clickContinue()
      await confirmationPage.waitForPage()
    })

    test('request check of an error @datafile', async ({ page }) => {
      const uploadMethodPage = await navigateToCheck(page)

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.File)
      const uploadFilePage = await uploadMethodPage.clickContinue()

      await uploadFilePage.waitForPage()
      await uploadFilePage.uploadFile('test/datafiles/article4directionareas-error.csv')
      const statusPage = await uploadFilePage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectCheckStatusButtonToBeVisible()
      const id = await statusPage.getIdFromUrl()

      await page.waitForTimeout(5000) // wait for 5 seconds for processing. could be smarter about this so we dont have to wait for the timeout to expire.

      const resultsPage = await statusPage.clickCheckStatusButton()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTableAndSummary()
      await resultsPage.expectPageHasTabs(false)
    })

    test('request check of a @url', async ({ page }) => {
      const uploadMethodPage = await navigateToCheck(page)

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      const submitURLPage = await uploadMethodPage.clickContinue()

      await submitURLPage.waitForPage()
      await submitURLPage.enterURL('https://raw.githubusercontent.com/digital-land/lpa-data-validator-frontend/main/test/datafiles/article4directionareas-ok.csv')
      const statusPage = await submitURLPage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectCheckStatusButtonToBeVisible()
      const id = await statusPage.getIdFromUrl()

      await page.waitForTimeout(5000) // wait for 10 seconds for processing. could be smarter about this so we dont have to wait 3 seconds

      const resultsPage = await statusPage.clickCheckStatusButton()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTabs(false)
    })

    test('request check of an error @url', async ({ page }) => {
      const uploadMethodPage = await navigateToCheck(page)

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      const submitURLPage = await uploadMethodPage.clickContinue()

      await submitURLPage.waitForPage()
      await submitURLPage.enterURL('https://raw.githubusercontent.com/digital-land/lpa-data-validator-frontend/pagination_acceptance_tests/test/datafiles/article4directionareas-error.csv')
      const statusPage = await submitURLPage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectCheckStatusButtonToBeVisible()
      const id = await statusPage.getIdFromUrl()

      await page.waitForTimeout(5000) // wait for 5 seconds for processing. could be smarter about this so we dont have to wait 3 seconds

      const resultsPage = await statusPage.clickCheckStatusButton()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTableAndSummary()
      await resultsPage.expectPageHasTabs(false)
    })
  })
})
