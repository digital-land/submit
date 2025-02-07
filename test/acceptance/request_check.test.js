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

let lastTimestamp = 0

function log (message, start = false) {
  if (start) {
    lastTimestamp = new Date().getTime()
    console.log(message)
    return
  }
  const currentTimestamp = new Date().getTime()
  const elapsed = (currentTimestamp - lastTimestamp) / 1000
  console.log(`${message} (Elapsed: ${elapsed.toFixed(2)}s)`)
  lastTimestamp = currentTimestamp
}

test.describe('Request Check', () => {
  test.describe('with javascript enabled', () => {
    test('request check of a @datafile', async ({ page }) => {
      log('Starting test: request check of a @datafile', true)

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
      log(`Extracted ID from URL: ${id}`)
      const resultsPage = await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTabs()
      const confirmationPage = await resultsPage.clickContinue()
      log('Navigated to confirmation page')
      await confirmationPage.waitForPage()
      log('Confirmation page loaded')
    })

    test('request check of an error @datafile', async ({ page }) => {
      log('Starting test: request check of an error @datafile', true)

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
      log(`Extracted ID from URL: ${id}`)
      const resultsPage = await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasBlockingTasks()
      await resultsPage.expectPageHasTabs()
    })

    test('request check of a @url', async ({ page }) => {
      log('Starting test: request check of a @url', true)

      const uploadMethodPage = await navigateToCheck(page)
      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      const submitURLPage = await uploadMethodPage.clickContinue()

      await submitURLPage.waitForPage()
      await submitURLPage.enterURL('https://raw.githubusercontent.com/digital-land/PublishExamples/refs/heads/main/Article4Direction/Files/Article4DirectionArea/article4directionareas-(Permitted-development-rights%20column%20missing).csv')
      const statusPage = await submitURLPage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectPageToHaveFinishedProcessing()
      const id = await statusPage.getIdFromUrl()
      log(`Extracted ID from URL: ${id}`)
      const resultsPage = await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTabs()
    })

    test('request check of an error @url', async ({ page }) => {
      log('Starting test: request check of an error @url', true)

      const uploadMethodPage = await navigateToCheck(page)
      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      const submitURLPage = await uploadMethodPage.clickContinue()

      await submitURLPage.waitForPage()
      await submitURLPage.enterURL('https://raw.githubusercontent.com/digital-land/PublishExamples/refs/heads/main/Article4Direction/Files/Article4DirectionArea/article4directionareas-errors.csv')
      const statusPage = await submitURLPage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectPageToHaveFinishedProcessing()
      const id = await statusPage.getIdFromUrl()
      log(`Extracted ID from URL: ${id}`)
      const resultsPage = await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasBlockingTasks()
      await resultsPage.expectPageHasTabs()
      const confirmationPage = await resultsPage.clickContinue()
      await confirmationPage.waitForPage()
      log('Navigated to confirmation page')
    })
  })

  test.describe('with javascript disabled', () => {
    test.use({ javaScriptEnabled: false })

    test('request check of a @datafile', async ({ page }) => {
      log('Starting test: request check of a @datafile with javascript disabled', true)

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
      log(`Extracted ID from URL: ${id}`)

      await page.waitForTimeout(5000)
      const resultsPage = await statusPage.clickCheckStatusButton()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTabs(false)
      const confirmationPage = await resultsPage.clickContinue()
      await confirmationPage.waitForPage()
      log('Navigated to confirmation page')
    })

    test('request check of an error @datafile', async ({ page }) => {
      log('Starting test: request check of an error @datafile with javascript disabled', true)

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
      log(`Extracted ID from URL: ${id}`)

      await page.waitForTimeout(5000)
      const resultsPage = await statusPage.clickCheckStatusButton()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasBlockingTasks()
      await resultsPage.expectPageHasTabs(false)
    })

    test('request check of a @url', async ({ page }) => {
      log('Starting test: request check of a @url with javascript disabled', true)

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
      log(`Extracted ID from URL: ${id}`)

      await page.waitForTimeout(5000)
      const resultsPage = await statusPage.clickCheckStatusButton()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasTabs(false)
    })

    test('request check of an error @url', async ({ page }) => {
      log('Starting test: request check of an error @url with javascript disabled', true)

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
      log(`Extracted ID from URL: ${id}`)

      await page.waitForTimeout(5000)
      const resultsPage = await statusPage.clickCheckStatusButton()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageHasTitle()
      await resultsPage.expectPageHasBlockingTasks()
      await resultsPage.expectPageHasTabs(false)
    })
  })
})
