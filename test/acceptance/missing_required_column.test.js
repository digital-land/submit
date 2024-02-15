import { test } from '@playwright/test'
import StartPOM from './PageObjectModels/startPOM'
import DatasetPOM from './PageObjectModels/datasetPOM'
import UploadMethodPOM from './PageObjectModels/uploadMethodPOM'
import UploadFilePOM from './PageObjectModels/uploadFilePOM'
import ErrorsPOM from './PageObjectModels/errorsPOM'

// a playwright test that uploads a file with a missing required column, and checks that the correct error message is displayed
test('when the user uploads a file with a missing required column, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const uploadMethodPOM = new UploadMethodPOM(page)
  const uploadFilePOM = new UploadFilePOM(page)
  const errorsPOM = new ErrorsPOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Conservation_area_dataset)
  await datasetPOM.clickContinue()

  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
  await uploadMethodPOM.clickContinue()

  await uploadFilePOM.uploadFile('test/testData/conservation-area-errors.csv')
  await uploadFilePOM.clickContinue()

  await errorsPOM.waitForPage()
  await errorsPOM.expectErrorSummaryToContain(['Reference column missing'])
})
