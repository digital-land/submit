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

function log (message) {
  const currentTimestamp = new Date().getTime()
  const elapsed = (currentTimestamp - lastTimestamp) / 1000
  console.log(`${message} (Elapsed: ${elapsed.toFixed(2)}s)`)
  lastTimestamp = currentTimestamp
}

test.describe('Request Check', () => {
  test.describe('with javascript enabled', () => {
    // test/acceptance/request_check.test.js (23-46)
    test('request check of a @datafile', async ({ page }) => {
      log('Starting test: request check of a @datafile')

      const uploadMethodPage = await navigateToCheck(page)
      log('Successfully navigated to the upload method page')

      await uploadMethodPage.waitForPage()
      log('Upload method page loaded')
      await uploadMethodPage.selectUploadMethod(uploadMethods.File)
      log('Selected file upload method')
      const uploadFilePage = await uploadMethodPage.clickContinue()

      await uploadFilePage.waitForPage()
      log('Upload file page loaded')
      await uploadFilePage.uploadFile('test/datafiles/article4directionareas-ok.csv')
      log('File uploaded')
      const statusPage = await uploadFilePage.clickContinue()

      await statusPage.waitForPage()
      log('Status page loaded')
      await statusPage.expectPageToBeProcessing()
      log('Page is processing')
      await statusPage.expectPageToHaveFinishedProcessing()
      log('Page has finished processing')
      const id = await statusPage.getIdFromUrl()
      log(`Extracted ID from URL: ${id}`)
      const resultsPage = await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      log('Results page loaded')
      await resultsPage.expectPageHasTitle()
      log('Results page has title')
      await resultsPage.expectPageHasTabs()
      log('Results page has tabs')

      const confirmationPage = await resultsPage.clickContinue()
      log('Navigated to confirmation page')
      await confirmationPage.waitForPage()
      log('Confirmation page loaded')
    })

    // test('request check of an error @datafile', async ({ page }) => {
    //   const uploadMethodPage = await navigateToCheck(page)

    //   await uploadMethodPage.waitForPage()
    //   await uploadMethodPage.selectUploadMethod(uploadMethods.File)
    //   const uploadFilePage = await uploadMethodPage.clickContinue()

    //   await uploadFilePage.waitForPage()
    //   await uploadFilePage.uploadFile('test/datafiles/article4directionareas-error.csv')
    //   const statusPage = await uploadFilePage.clickContinue()

    //   await statusPage.waitForPage()
    //   await statusPage.expectPageToBeProcessing()
    //   await statusPage.expectPageToHaveFinishedProcessing()
    //   const id = await statusPage.getIdFromUrl()
    //   const resultsPage = await statusPage.clickContinue()

    //   await resultsPage.waitForPage(id)
    //   await resultsPage.expectPageHasTitle()

    //   await resultsPage.expectPageHasBlockingTasks()
    //   await resultsPage.expectPageHasTabs()
    // })

    // test/acceptance/request_check.test.js (72-92)
    test('request check of a @url', async ({ page }) => {
      log('Starting test: request check of a @url')

      const uploadMethodPage = await navigateToCheck(page)
      console.log('Navigated to check page')

      await uploadMethodPage.waitForPage()
      console.log('Upload method page loaded')
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      console.log('Selected upload method: URL')
      const submitURLPage = await uploadMethodPage.clickContinue()
      console.log('Clicked continue to submit URL page')

      await submitURLPage.waitForPage()
      console.log('Submit URL page loaded')
      await submitURLPage.enterURL('https://raw.githubusercontent.com/digital-land/PublishExamples/refs/heads/main/Article4Direction/Files/Article4DirectionArea/article4directionareas-(Permitted-development-rights%20column%20missing).csv')
      console.log('Entered URL')
      const statusPage = await submitURLPage.clickContinue()
      console.log('Clicked continue to status page')

      await statusPage.waitForPage()
      console.log('Status page loaded')
      await statusPage.expectPageToBeProcessing()
      console.log('Page is processing')
      await statusPage.expectPageToHaveFinishedProcessing()
      console.log('Page finished processing')
      const id = await statusPage.getIdFromUrl()
      console.log(`Got ID from URL: ${id}`)
      const resultsPage = await statusPage.clickContinue()
      console.log('Clicked continue to results page')

      await resultsPage.waitForPage(id)
      console.log('Results page loaded')
      await resultsPage.expectPageHasTitle()
      console.log('Page has title')
      await resultsPage.expectPageHasTabs()
      console.log('Page has tabs')
      console.log('Test completed')
    })

    // test('request check of an error @url', async ({ page }) => {
    //   const uploadMethodPage = await navigateToCheck(page)

    //   await uploadMethodPage.waitForPage()
    //   await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
    //   const submitURLPage = await uploadMethodPage.clickContinue()

    //   await submitURLPage.waitForPage()
    //   await submitURLPage.enterURL('https://raw.githubusercontent.com/digital-land/PublishExamples/refs/heads/main/Article4Direction/Files/Article4DirectionArea/article4directionareas-errors.csv')
    //   const statusPage = await submitURLPage.clickContinue()

    //   await statusPage.waitForPage()
    //   await statusPage.expectPageToBeProcessing()
    //   await statusPage.expectPageToHaveFinishedProcessing()
    //   const id = await statusPage.getIdFromUrl()
    //   const resultsPage = await statusPage.clickContinue()

    //   await resultsPage.waitForPage(id)
    //   await resultsPage.expectPageHasTitle()
    //   await resultsPage.expectPageHasBlockingTasks()
    //   await resultsPage.expectPageHasTabs()

    //   const confirmationPage = await resultsPage.clickContinue()
    //   await confirmationPage.waitForPage()
    // })
  })

  // test.describe('With javascript disabled', () => {
  //   test.use({ javaScriptEnabled: false })

  //   test('request check of a @datafile', async ({ page }) => {
  //     const uploadMethodPage = await navigateToCheck(page)

  //     await uploadMethodPage.waitForPage()
  //     await uploadMethodPage.selectUploadMethod(uploadMethods.File)
  //     const uploadFilePage = await uploadMethodPage.clickContinue()

  //     await uploadFilePage.waitForPage()
  //     await uploadFilePage.uploadFile('test/datafiles/article4directionareas-ok.csv')
  //     const statusPage = await uploadFilePage.clickContinue()

  //     await statusPage.waitForPage()
  //     await statusPage.expectPageToBeProcessing()
  //     await statusPage.expectCheckStatusButtonToBeVisible()
  //     const id = await statusPage.getIdFromUrl()

  //     await page.waitForTimeout(5000) // wait for 5 seconds for processing. could be smarter about this so we dont have to wait for the timeout to expire.

  //     const resultsPage = await statusPage.clickCheckStatusButton()

  //     await resultsPage.waitForPage(id)
  //     await resultsPage.expectPageHasTitle()
  //     await resultsPage.expectPageHasTabs(false)

  //     const confirmationPage = await resultsPage.clickContinue()
  //     await confirmationPage.waitForPage()
  //   })

  //   test('request check of an error @datafile', async ({ page }) => {
  //     const uploadMethodPage = await navigateToCheck(page)

  //     await uploadMethodPage.waitForPage()
  //     await uploadMethodPage.selectUploadMethod(uploadMethods.File)
  //     const uploadFilePage = await uploadMethodPage.clickContinue()

  //     await uploadFilePage.waitForPage()
  //     await uploadFilePage.uploadFile('test/datafiles/article4directionareas-error.csv')
  //     const statusPage = await uploadFilePage.clickContinue()

  //     await statusPage.waitForPage()
  //     await statusPage.expectPageToBeProcessing()
  //     await statusPage.expectCheckStatusButtonToBeVisible()
  //     const id = await statusPage.getIdFromUrl()

  //     await page.waitForTimeout(5000) // wait for 5 seconds for processing. could be smarter about this so we dont have to wait for the timeout to expire.

  //     const resultsPage = await statusPage.clickCheckStatusButton()

  //     await resultsPage.waitForPage(id)
  //     await resultsPage.expectPageHasTitle()
  //     await resultsPage.expectPageHasBlockingTasks()
  //     await resultsPage.expectPageHasTabs(false)
  //   })

  //   test('request check of a @url', async ({ page }) => {
  //     const uploadMethodPage = await navigateToCheck(page)

  //     await uploadMethodPage.waitForPage()
  //     await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
  //     const submitURLPage = await uploadMethodPage.clickContinue()

  //     await submitURLPage.waitForPage()
  //     await submitURLPage.enterURL('https://raw.githubusercontent.com/digital-land/lpa-data-validator-frontend/main/test/datafiles/article4directionareas-ok.csv')
  //     const statusPage = await submitURLPage.clickContinue()

  //     await statusPage.waitForPage()
  //     await statusPage.expectPageToBeProcessing()
  //     await statusPage.expectCheckStatusButtonToBeVisible()
  //     const id = await statusPage.getIdFromUrl()

  //     await page.waitForTimeout(5000) // wait for 10 seconds for processing. could be smarter about this so we dont have to wait 3 seconds

  //     const resultsPage = await statusPage.clickCheckStatusButton()

  //     await resultsPage.waitForPage(id)
  //     await resultsPage.expectPageHasTitle()
  //     await resultsPage.expectPageHasTabs(false)
  //   })

  //   test('request check of an error @url', async ({ page }) => {
  //     const uploadMethodPage = await navigateToCheck(page)

  //     await uploadMethodPage.waitForPage()
  //     await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
  //     const submitURLPage = await uploadMethodPage.clickContinue()

  //     await submitURLPage.waitForPage()
  //     await submitURLPage.enterURL('https://raw.githubusercontent.com/digital-land/lpa-data-validator-frontend/pagination_acceptance_tests/test/datafiles/article4directionareas-error.csv')
  //     const statusPage = await submitURLPage.clickContinue()

  //     await statusPage.waitForPage()
  //     await statusPage.expectPageToBeProcessing()
  //     await statusPage.expectCheckStatusButtonToBeVisible()
  //     const id = await statusPage.getIdFromUrl()

  //     await page.waitForTimeout(5000) // wait for 5 seconds for processing. could be smarter about this so we dont have to wait 3 seconds

  //     const resultsPage = await statusPage.clickCheckStatusButton()

  //     await resultsPage.waitForPage(id)
  //     await resultsPage.expectPageHasTitle()
  //     await resultsPage.expectPageHasBlockingTasks()
  //     await resultsPage.expectPageHasTabs(false)
  //   })
  // })
})
