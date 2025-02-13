/*
    this file will hold acceptance tests for requesting checks
    the acceptance criteria we are basing these tests on are:
        - request check of a datafile with javascript enabled
        - request check of a datafile with javascript disabled
        - request check of a datafile when javascript fails
*/

import { test, expect } from '@playwright/test'
import UploadMethodPage, { uploadMethods } from '../PageObjectModels/uploadMethodPage'

test.setTimeout(300000)

const navigateToCheck = async (page) => {
  await page.goto('/check/link?dataset=article-4-direction&orgName=Adur%20District%20Council&orgId=local-authority%3AADU')
  return new UploadMethodPage(page)
}

const okFile = 'https://raw.githubusercontent.com/digital-land/PublishExamples/refs/heads/main/Article4Direction/Files/Article4DirectionArea/article4directionareas-ok.csv'
const errorFile = 'https://raw.githubusercontent.com/digital-land/PublishExamples/refs/heads/main/Article4Direction/Files/Article4DirectionArea/article4directionareas-errors.csv'

let lastTimestamp = 0

async function checkDataFile ({ page, jsEnabled }) {
  log(`Starting test: request check of a @datafile, jsEnabled=${jsEnabled}`, true)

  const uploadMethodPage = await navigateToCheck(page)
  await uploadMethodPage.waitForPage()
  await uploadMethodPage.selectUploadMethod(uploadMethods.File)
  const uploadFilePage = await uploadMethodPage.clickContinue()

  await uploadFilePage.waitForPage()
  await uploadFilePage.uploadFile('test/datafiles/article4directionareas-ok.csv')
  const statusPage = await uploadFilePage.clickContinue()

  await statusPage.waitForPage()
  await statusPage.expectPageToBeProcessing()

  if (jsEnabled) {
    await statusPage.expectPageToHaveFinishedProcessing()
  } else {
    await statusPage.expectCheckStatusButtonToBeVisible()
    await page.waitForTimeout(5000)
  }

  const id = await statusPage.getIdFromUrl()
  log(`Extracted ID from URL: ${id}`)

  /** @type {import('../PageObjectModels/resultsPage.js').default} ResultsPage */
  let resultsPage
  if (jsEnabled) {
    resultsPage = await statusPage.clickContinue()
    resultsPage.expectPageHasTabs(jsEnabled)
  } else {
    await page.waitForTimeout(5000)
    resultsPage = await statusPage.clickCheckStatusButton()
  }

  await resultsPage.waitForPage(id)
  await resultsPage.expectPageHasTitle()
  await resultsPage.expectPageHasTabs(jsEnabled)
  const confirmationPage = await resultsPage.clickContinue()
  log('Navigated to confirmation page')
  await confirmationPage.waitForPage()
  log('Confirmation page loaded')
}

async function checkErrorDataFile ({ page, jsEnabled }) {
  log(`Starting test: request check of an error @datafile, jsEnabled=${jsEnabled}`, true)

  const uploadMethodPage = await navigateToCheck(page)
  await uploadMethodPage.waitForPage()
  await uploadMethodPage.selectUploadMethod(uploadMethods.File)
  /** @type {import('../PageObjectModels/uploadFilePage').default} UploadFilePage */
  const uploadFilePage = await uploadMethodPage.clickContinue()

  await uploadFilePage.waitForPage()
  await uploadFilePage.uploadFile('test/datafiles/article4directionareas-error.csv')
  /** @type {import('../PageObjectModels/statusPage.js').default} StatusPage */
  const statusPage = await uploadFilePage.clickContinue()

  await statusPage.waitForPage()
  await statusPage.expectPageToBeProcessing()

  if (jsEnabled) {
    await statusPage.expectPageToHaveFinishedProcessing()
  } else {
    await statusPage.expectCheckStatusButtonToBeVisible()
  }

  const id = await statusPage.getIdFromUrl()
  log(`Extracted ID from URL: ${id}`)
  /** @type {import('../PageObjectModels/resultsPage.js').default} ResultsPage */
  let resultsPage
  if (jsEnabled) {
    resultsPage = await statusPage.clickContinue()
  } else {
    await page.waitForTimeout(5000)
    resultsPage = await statusPage.clickCheckStatusButton()
  }

  await resultsPage.waitForPage(id)
  await resultsPage.expectPageHasTitle()
  await resultsPage.expectPageHasBlockingTasks()
  await resultsPage.expectPageHasTabs(jsEnabled)

  // issue details page
  await page.getByText('description column is missing').click()
  await page.waitForURL(/\/check\/results\/.*\/issue\/.*/, { timeout: 4000 })
  await expect(page.getByText('Your data has issues')).toBeVisible()
  await expect(page.getByText('You cannot submit your data until you fix the issues')).toBeVisible()
  const itemsLocator = page.locator('.govuk-error-summary ul li')
  expect(await itemsLocator.count()).toBe(1)
  await expect(itemsLocator).toContainText('1 issue of type missing column')
  await expect(page.getByText('How to improve Adur District Council’s data')).toBeVisible()

  // verify we get correctly routed to a 404
  const nonExistingIssue = page.url().replace(/.*\/check/, '/check').replace('/description', '/foobar')
  const response = await page.goto(nonExistingIssue)
  expect(response.status()).toBe(404)
}

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
      await checkDataFile({ page, jsEnabled: true })
    })

    test('request check of an error @datafile', async ({ page }) => {
      await checkErrorDataFile({ page, jsEnabled: true })
    })

    test('request check of a @url', async ({ page }) => {
      log('Starting test: request check of a @url', true)

      const uploadMethodPage = await navigateToCheck(page)
      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      const submitURLPage = await uploadMethodPage.clickContinue()

      await submitURLPage.waitForPage()
      await submitURLPage.enterURL(okFile)
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

      const confirmationPage = await resultsPage.clickContinue()
      await confirmationPage.waitForPage()
      log('Navigated to confirmation page')
    })

    test('request check of an error @url', async ({ page }) => {
      log('Starting test: request check of an error @url', true)

      const uploadMethodPage = await navigateToCheck(page)
      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      const submitURLPage = await uploadMethodPage.clickContinue()

      await submitURLPage.waitForPage()
      await submitURLPage.enterURL(errorFile)
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
    })
  })

  test.describe('with javascript disabled', () => {
    test.use({ javaScriptEnabled: false })

    test('request check of a @datafile', async ({ page }) => {
      await checkDataFile({ page, jsEnabled: false })
    })

    test('request check of an error @datafile', async ({ page }) => {
      await checkErrorDataFile({ page, jsEnabled: false })
    })

    test('request check of a @url', async ({ page }) => {
      log('Starting test: request check of a @url with javascript disabled', true)

      const uploadMethodPage = await navigateToCheck(page)
      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      const submitURLPage = await uploadMethodPage.clickContinue()

      await submitURLPage.waitForPage()
      await submitURLPage.enterURL(okFile)
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

      const confirmationPage = await resultsPage.clickContinue()
      await confirmationPage.waitForPage()
      log('Navigated to confirmation page')
    })

    test('request check of an error @url', async ({ page }) => {
      log('Starting test: request check of an error @url with javascript disabled', true)

      const uploadMethodPage = await navigateToCheck(page)
      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
      const submitURLPage = await uploadMethodPage.clickContinue()

      await submitURLPage.waitForPage()
      await submitURLPage.enterURL(errorFile)
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
