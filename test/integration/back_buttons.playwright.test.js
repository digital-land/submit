import { test } from '@playwright/test'

import StartPage from '../PageObjectModels/startPage'

import { datasets } from '../PageObjectModels/datasetPage'
import { geometryTypes } from '../PageObjectModels/geometryTypePage'
import { uploadMethods } from '../PageObjectModels/uploadMethodPage'

test.describe('Back buttons work as expected without js for...', () => {
  test.use({ javaScriptEnabled: false })

  test('data set page', async ({ page }) => {
    const startPage = new StartPage(page)

    await startPage.navigateHere()
    const datasetPage = await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })

  test('geometry type page', async ({ page }) => {
    const startPage = new StartPage(page)

    await startPage.navigateHere()
    const datasetPage = await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Tree)
    const geometryTypePage = await datasetPage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })

  test('upload method page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)

    await startPage.navigateHere()
    const datasetPage = await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Article_4_direction_area_dataset)
    const uploadMethodPage = await datasetPage.clickContinue()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })

  test('upload method page (from geometry type)', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)

    await startPage.navigateHere()
    const datasetPage = await startPage.clickStartNow()

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

    await startPage.waitForPage()
  })

  test('upload file page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)

    await startPage.navigateHere()
    const datasetPage = await startPage.clickStartNow()

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

    await startPage.waitForPage()
  })

  test('upload url page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)

    await startPage.navigateHere()
    const datasetPage = await startPage.clickStartNow()

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

    await startPage.waitForPage()
  })
})
