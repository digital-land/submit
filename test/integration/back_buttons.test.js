import { test } from '@playwright/test'
import StartPage from '../PageObjectModels/startPage'
import DatasetPage from '../PageObjectModels/datasetPage'
import GeometryTypePage from '../PageObjectModels/geometryTypePage'
import UploadMethodPage from '../PageObjectModels/uploadMethodPage'
import UploadFilePage from '../PageObjectModels/uploadFilePage'
import UploadURLPage from '../PageObjectModels/uploadURLPage'
import StatusPage from '../PageObjectModels/statusPage'
import ErrorsPage from '../PageObjectModels/errorsPage'
import NoErrorsPage from '../PageObjectModels/noErrorsPage'

test.use({ javaScriptEnabled: false })

test.describe('Back buttons work as expected without js for', () => {
  test.skip('data set page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })

  test.skip('geometry type page', async ({ page, baseURL }) => {
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

  test.skip('upload method page', async ({ page, baseURL }) => {
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

  test.skip('upload method page (from geometry type)', async ({ page, baseURL }) => {
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

  test.skip('upload file page', async ({ page, baseURL }) => {
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

  test.skip('upload url page', async ({ page, baseURL }) => {
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

  // ToDo: Skipping following as backend not working with urls yet
  test.skip('status page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)
    const uploadMethodPage = new UploadMethodPage(page)
    const uploadURLPage = new UploadURLPage(page)
    const statusPage = new StatusPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Article_4_direction_area_dataset)
    await datasetPage.clickContinue()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.URL)
    await uploadMethodPage.clickContinue()

    await uploadURLPage.waitForPage()
    await uploadURLPage.enterURL('https://example.com/article-4-direction-area.csv')
    await uploadURLPage.clickContinue()

    await statusPage.waitForPage()
    await statusPage.goBack()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })

  test.skip('errors page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)
    const uploadMethodPage = new UploadMethodPage(page)
    const uploadURLPage = new UploadURLPage(page)
    const errorsPage = new ErrorsPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Conservation_area_dataset)
    await datasetPage.clickContinue()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.URL)
    await uploadMethodPage.clickContinue()

    await uploadURLPage.waitForPage()
    await uploadURLPage.enterURL('https://example.com/conservation-area-errors.csv')
    await uploadURLPage.clickContinue()

    await errorsPage.waitForPage()
    await errorsPage.goBack()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })

  test.skip('no errors page', async ({ page, baseURL }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)
    const uploadMethodPage = new UploadMethodPage(page)
    const uploadURLPage = new UploadURLPage(page)
    const noErrorsPage = new NoErrorsPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Conservation_area_dataset)
    await datasetPage.clickContinue()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.URL)
    await uploadMethodPage.clickContinue()

    await uploadURLPage.waitForPage()
    await uploadURLPage.enterURL('https://example.com/conservation-area-ok.csv')
    await uploadURLPage.clickContinue()

    await noErrorsPage.waitForPage()
    await noErrorsPage.goBack()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.goBack()

    await datasetPage.waitForPage()
    await datasetPage.goBack()

    await startPage.waitForPage()
  })
})
