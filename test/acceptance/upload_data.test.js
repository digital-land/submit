import { test } from '@playwright/test'
import StartPOM from './PageObjectModels/startPOM'
import DatasetPOM from './PageObjectModels/datasetPOM'
import UploadMethodPOM from './PageObjectModels/uploadMethodPOM'
import GeometryTypePOM from './PageObjectModels/geometryTypePOM'
import UploadFilePOM from './PageObjectModels/uploadFilePOM'
import UploadURLPOM from './PageObjectModels/uploadURLPOM'
import ErrorsPOM from './PageObjectModels/errorsPOM'
import NoErrorsPOM from './PageObjectModels/noErrorsPOM'
import ConfirmationPOM from './PageObjectModels/confirmationPOM'

test('Enter form information', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const uploadMethodPOM = new UploadMethodPOM(page)
  const uploadFilePOM = new UploadFilePOM(page)
  const noErrorsPOM = new NoErrorsPOM(page)
  const confirmationPOM = new ConfirmationPOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Conservation_area_dataset)
  await datasetPOM.clickContinue()

  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
  await uploadMethodPOM.clickContinue()

  await uploadFilePOM.uploadFile('test/testData/conservation-area-ok.csv')
  await uploadFilePOM.clickContinue()

  await noErrorsPOM.waitForPage()
  await noErrorsPOM.clickContinue()

  await confirmationPOM.waitForPage()
})

// currently skipping this test as im not sure how to go about providing the pipeline runner api
test('Enter form information and upload a file with errors and without errors', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const uploadMethodPOM = new UploadMethodPOM(page)
  const uploadFilePOM = new UploadFilePOM(page)
  const errorsPOM = new ErrorsPOM(page)
  const noErrorsPOM = new NoErrorsPOM(page)
  const confirmationPOM = new ConfirmationPOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Conservation_area_dataset)
  await datasetPOM.clickContinue()

  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
  await uploadMethodPOM.clickContinue()

  await uploadFilePOM.uploadFile('test/testData/conservation-area-errors.csv')
  await uploadFilePOM.clickContinue()

  await errorsPOM.waitForPage()
  await errorsPOM.clickUploadNewVersion()

  await uploadMethodPOM.waitForPage()
  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
  await uploadMethodPOM.clickContinue()

  await uploadFilePOM.uploadFile('test/testData/conservation-area-ok.csv')
  await uploadFilePOM.clickContinue()

  await noErrorsPOM.waitForPage()
  await noErrorsPOM.clickContinue()

  await confirmationPOM.waitForPage()
})

test('Enter form information and specify a URL without errors', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const uploadMethodPOM = new UploadMethodPOM(page)
  const uploadURLPOM = new UploadURLPOM(page)
  const noErrorsPOM = new NoErrorsPOM(page)
  const confirmationPOM = new ConfirmationPOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Conservation_area_dataset)
  await datasetPOM.clickContinue()

  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.URL)
  await uploadMethodPOM.clickContinue()

  await uploadURLPOM.enterURL('https://example.com/conservation-area-ok.csv')
  await uploadURLPOM.clickContinue()

  await noErrorsPOM.waitForPage()
  await noErrorsPOM.clickContinue()

  await confirmationPOM.waitForPage()
})

test('Enter form information and specify a URL with errors then without errors', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const uploadMethodPOM = new UploadMethodPOM(page)
  const uploadURLPOM = new UploadURLPOM(page)
  const errorsPOM = new ErrorsPOM(page)
  const noErrorsPOM = new NoErrorsPOM(page)
  const confirmationPOM = new ConfirmationPOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Conservation_area_dataset)
  await datasetPOM.clickContinue()

  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.URL)
  await uploadMethodPOM.clickContinue()

  await uploadURLPOM.enterURL('https://example.com/conservation-area-errors.csv')
  await uploadURLPOM.clickContinue()

  await errorsPOM.waitForPage()
  await errorsPOM.clickUploadNewVersion()

  await uploadMethodPOM.waitForPage()
  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.URL)
  await uploadMethodPOM.clickContinue()

  await uploadURLPOM.enterURL('https://example.com/conservation-area-ok.csv')
  await uploadURLPOM.clickContinue()

  await noErrorsPOM.waitForPage()
  await noErrorsPOM.clickContinue()

  await confirmationPOM.waitForPage()
})

test('enter form information for dataset tree, forcing you to select the geometry type. then upload a file with errors and without errors', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const geometryTypePOM = new GeometryTypePOM(page)
  const uploadMethodPOM = new UploadMethodPOM(page)
  const uploadFilePOM = new UploadFilePOM(page)
  const errorsPOM = new ErrorsPOM(page)
  const noErrorsPOM = new NoErrorsPOM(page)
  const confirmationPOM = new ConfirmationPOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Tree)
  await datasetPOM.clickContinue()

  await geometryTypePOM.waitForPage()
  await geometryTypePOM.selectGeometryType(GeometryTypePOM.geometryTypes.point)
  await geometryTypePOM.clickContinue()

  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
  await uploadMethodPOM.clickContinue()

  await uploadFilePOM.uploadFile('test/testData/tree-errors.csv')
  await uploadFilePOM.clickContinue()

  await errorsPOM.waitForPage()
  await errorsPOM.clickUploadNewVersion()

  await uploadMethodPOM.waitForPage()
  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
  await uploadMethodPOM.clickContinue()

  await uploadFilePOM.uploadFile('test/testData/tree-ok.csv')
  await uploadFilePOM.clickContinue()

  await noErrorsPOM.waitForPage()
  await noErrorsPOM.clickContinue()

  await confirmationPOM.waitForPage()
})
