import { test } from '@playwright/test'

import StartPage from '../PageObjectModels/startPage'
import DatasetPage, { datasets } from '../PageObjectModels/datasetPage'

import { geometryTypes } from '../PageObjectModels/geometryTypePage'
import UploadMethodPage, { uploadMethods } from '../PageObjectModels/uploadMethodPage'
import LandingPage from '../PageObjectModels/landingPage'

test.describe('Back buttons work as expected without js for...', () => {
  test.use({ javaScriptEnabled: false })

  test('data set page', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const chooseUploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await chooseUploadMethodPage.waitForPage()
    await chooseUploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.verifyAndReturnPage(LandingPage)
  })

  test('geometry type page', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const chooseUploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await chooseUploadMethodPage.waitForPage()
    await chooseUploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.selectDataset(datasets.Tree)

    const geometryTypePage = await datasetPage.clickContinue()
    await geometryTypePage.waitForPage()
    await geometryTypePage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.verifyAndReturnPage(LandingPage)
  })

  test('upload method page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const chooseUploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await chooseUploadMethodPage.waitForPage()
    await chooseUploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.verifyAndReturnPage(LandingPage)
  })

  test('upload method page (from geometry type)', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const chooseUploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await chooseUploadMethodPage.waitForPage()
    await chooseUploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Tree)

    const geometryTypePage = await datasetPage.clickContinue()
    await geometryTypePage.waitForPage()
    await geometryTypePage.selectGeometryType(geometryTypes.point)

    const uploadMethodPage = await geometryTypePage.clickContinue()
    await uploadMethodPage.waitForPage()
    await uploadMethodPage.goBack()

    // for now we go back to the dataset selection page, maybe in the future we might want to go back to the geometry type page here
    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.verifyAndReturnPage(LandingPage)
  })

  test('upload file page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const chooseUploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await chooseUploadMethodPage.waitForPage()
    await chooseUploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Article_4_direction_area_dataset)

    const uploadMethodPage = await datasetPage.clickContinue()
    await uploadMethodPage.waitForPage()
    await uploadMethodPage.selectUploadMethod(uploadMethods.File)

    const uploadFilePage = await uploadMethodPage.clickContinue()
    await uploadFilePage.waitForPage()
    await uploadFilePage.goBack()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.verifyAndReturnPage(LandingPage)
  })

  test('upload url page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const chooseUploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await chooseUploadMethodPage.waitForPage()
    await chooseUploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Article_4_direction_area_dataset)

    const uploadMethodPage = await datasetPage.clickContinue()
    await uploadMethodPage.waitForPage()
    await uploadMethodPage.selectUploadMethod(uploadMethods.URL)

    const submitURLPage = await uploadMethodPage.clickContinue()
    await submitURLPage.waitForPage()
    await submitURLPage.goBack()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.verifyAndReturnPage(LandingPage)
  })
})
