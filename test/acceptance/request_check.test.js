/*
    this file will hold acceptance tests for requesting checks
    the acceptance criteria we are basing these tests on are:
        - request check of a datafile with javascript enabled
        - request check of a datafile with javascript disabled
        - request check of a datafile when javascript fails
*/

import { test } from '@playwright/test'

import StartPage from '../PageObjectModels/startPage'
import DatasetPage from '../PageObjectModels/datasetPage'
import UploadMethodPage from '../PageObjectModels/uploadMethodPage'
import UploadFilePage from '../PageObjectModels/uploadFilePage'
import StatusPage from '../PageObjectModels/statusPage'
import ResultsPage from '../PageObjectModels/resultsPage'

test.describe('Request Check', () => {
  test.describe('with javascript enabled', () => {
    test('request check of a datafile', async ({ page }) => {
      const startPage = new StartPage(page)
      const datasetPage = new DatasetPage(page)
      const uploadMethodPage = new UploadMethodPage(page)
      const uploadFilePage = new UploadFilePage(page)
      const statusPage = new StatusPage(page)
      const resultsPage = new ResultsPage(page)

      await startPage.navigateHere()
      await startPage.clickStartNow()

      await datasetPage.waitForPage()
      await datasetPage.selectDataset(DatasetPage.datasets.Article_4_direction_area_dataset)
      await datasetPage.clickContinue()

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.File)
      await uploadMethodPage.clickContinue()

      await uploadFilePage.waitForPage()
      await uploadFilePage.uploadFile('test/datafiles/article4directionareas-ok.csv')
      await uploadFilePage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectPageToHaveFinishedProcessing()
      const id = await statusPage.getIdFromUrl()
      await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageIsNoErrorsPage()
    })

    test.skip('request check of a url', async ({ page }) => {
      const startPage = new StartPage(page)
      const datasetPage = new DatasetPage(page)
      const uploadMethodPage = new UploadMethodPage(page)
      const uploadFilePage = new UploadFilePage(page)
      const statusPage = new StatusPage(page)
      const resultsPage = new ResultsPage(page)

      await startPage.navigateHere()
      await startPage.clickStartNow()

      await datasetPage.waitForPage()
      await datasetPage.selectDataset(DatasetPage.datasets.Article_4_direction_area_dataset)
      await datasetPage.clickContinue()

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.File)
      await uploadMethodPage.clickContinue()

      await uploadFilePage.waitForPage()
      await uploadFilePage.uploadFile('test/datafiles/Article_4_direction_area_dataset.csv')
      await uploadFilePage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectStatusToBe('NEW')
      await statusPage.expectStatusToBe('IN_PROGRESS')
      await statusPage.waitForContinueButton()
      await statusPage.expectStatusToBe('COMPLETE')
      await statusPage.clickContinue()

      await resultsPage.waitForPage()
      await resultsPage.expectPageIsNoErrorsPage()
    })
  })

  test.describe('With javascript disabled', () => {
    test.use({ javaScriptEnabled: false })

    test('request check of a datafile', async ({ page }) => {
      const startPage = new StartPage(page)
      const datasetPage = new DatasetPage(page)
      const uploadMethodPage = new UploadMethodPage(page)
      const uploadFilePage = new UploadFilePage(page)
      const statusPage = new StatusPage(page)
      const resultsPage = new ResultsPage(page)

      await startPage.navigateHere()
      await startPage.clickStartNow()

      await datasetPage.waitForPage()
      await datasetPage.selectDataset(DatasetPage.datasets.Article_4_direction_area_dataset)
      await datasetPage.clickContinue()

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.File)
      await uploadMethodPage.clickContinue()

      await uploadFilePage.waitForPage()
      await uploadFilePage.uploadFile('test/datafiles/article4directionareas-ok.csv')
      await uploadFilePage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectPageToBeProcessing()
      await statusPage.expectCheckStatusButtonToBeVisible()
      const id = await statusPage.getIdFromUrl()

      await page.waitForTimeout(3000) // wait for 3 seconds for processing. could be smarter about this so we dont have to wait 3 seconds

      await statusPage.clickCheckStatusButton()

      // await statusPage.waitForPage(id)
      // await statusPage.expectPageToHaveFinishedProcessing()
      // await statusPage.clickContinue()

      await resultsPage.waitForPage(id)
      await resultsPage.expectPageIsNoErrorsPage()
    })

    test.skip('request check of a url', async ({ page }) => {
      const startPage = new StartPage(page)
      const datasetPage = new DatasetPage(page)
      const uploadMethodPage = new UploadMethodPage(page)
      const uploadFilePage = new UploadFilePage(page)
      const statusPage = new StatusPage(page)
      const resultsPage = new ResultsPage(page)

      await startPage.navigateHere()
      await startPage.clickStartNow()

      await datasetPage.waitForPage()
      await datasetPage.selectDataset(DatasetPage.datasets.Article_4_direction_area_dataset)
      await datasetPage.clickContinue()

      await uploadMethodPage.waitForPage()
      await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.File)
      await uploadMethodPage.clickContinue()

      await uploadFilePage.waitForPage()
      await uploadFilePage.uploadFile('test/datafiles/Article_4_direction_area_dataset.csv')
      await uploadFilePage.clickContinue()

      await statusPage.waitForPage()
      await statusPage.expectStatusToBe('NEW')
      await statusPage.expectStatusToBe('IN_PROGRESS')
      await statusPage.waitForContinueButton()
      await statusPage.expectStatusToBe('COMPLETE')
      await statusPage.clickContinue()

      await resultsPage.waitForPage()
      await resultsPage.expectPageIsNoErrorsPage()
    })
  })
})
