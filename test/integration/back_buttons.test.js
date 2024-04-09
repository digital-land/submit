import { test } from '@playwright/test'

import Localstack from '../testContainers/localstack'

import config from '../../config/index'

import StartPage from '../PageObjectModels/startPage'
import DatasetPage from '../PageObjectModels/datasetPage'
import GeometryTypePage from '../PageObjectModels/geometryTypePage'
import UploadMethodPage from '../PageObjectModels/uploadMethodPage'
import UploadFilePage from '../PageObjectModels/uploadFilePage'
import UploadURLPage from '../PageObjectModels/uploadURLPage'

let localstack

test.describe('Back buttons work as expected without js for...', async () => {
  test.use({ javaScriptEnabled: false })

  test.beforeAll(async () => {
    test.setTimeout(2 * 60 * 1000)
    localstack = await new Localstack().start()
    await localstack.createBucket(config.aws.bucket)
  })

  test.afterAll(async () => {
    await localstack.stop()
  })

  test('data set page', async ({ page }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })

  test('geometry type page', async ({ page }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)
    const geometryTypePage = new GeometryTypePage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Tree)
    await datasetPage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })

  test('upload method page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)
    const uploadMethodPage = new UploadMethodPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Article_4_direction_area_dataset)
    await datasetPage.clickContinue()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })

  test('upload method page (from geometry type)', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)
    const geometryTypePage = new GeometryTypePage(page)
    const uploadMethodPage = new UploadMethodPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Tree)
    await datasetPage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.selectGeometryType(GeometryTypePage.geometryTypes.point)
    await geometryTypePage.clickContinue()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.goBack()

    // for now we go back to the dataset selection page, maybe in the future we might want to go back to the geometry type page here
    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })

  test('upload file page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)
    const uploadMethodPage = new UploadMethodPage(page)
    const uploadFilePage = new UploadFilePage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Article_4_direction_area_dataset)
    await datasetPage.clickContinue()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.File)
    await uploadMethodPage.clickContinue()

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
    const datasetPage = new DatasetPage(page)
    const uploadMethodPage = new UploadMethodPage(page)
    const uploadURLPage = new UploadURLPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Article_4_direction_area_dataset)
    await datasetPage.clickContinue()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.URL)
    await uploadMethodPage.clickContinue()

    await uploadURLPage.waitForPage()
    await uploadURLPage.goBack()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })
})
