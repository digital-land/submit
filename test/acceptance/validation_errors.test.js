import { test } from '@playwright/test'
import StartPOM from './PageObjectModels/startPOM'
import DatasetPOM from './PageObjectModels/datasetPOM'
import GeometryTypePOM from './PageObjectModels/geometryTypePOM'
import UploadMethodPOM from './PageObjectModels/uploadMethodPOM'
import UploadFilePOM from './PageObjectModels/uploadFilePOM'
import UploadURLPOM from './PageObjectModels/uploadURLPOM'
import ErrorsPOM from './PageObjectModels/errorsPOM'

test('when the user clicks continue on the dataset page without entering a dataset, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.clickContinue()
  const expectedErrors = [
    {
      fieldName: 'input#dataset.govuk-radios__input',
      expectedErrorMessage: 'Select a dataset'
    }
  ]
  await datasetPOM.expectErrorMessages(expectedErrors)
})

test('when the user clicks continue on the geometry-type page without entering a geometry type, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const geometryTypePOM = new GeometryTypePOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Tree)
  await datasetPOM.clickContinue()

  await geometryTypePOM.clickContinue()
  const expectedErrors = [
    {
      fieldName: 'input#geom-type.govuk-radios__input',
      expectedErrorMessage: 'Select if your geometry data given as points or polygons'
    }
  ]
  await geometryTypePOM.expectErrorMessages(expectedErrors)
})

test('when the user clicks continue on the how do you want to provide your data page without selecting a method, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const uploadMethodPOM = new UploadMethodPOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Conservation_area_dataset)
  await datasetPOM.clickContinue()

  await uploadMethodPOM.clickContinue()
  const expectedErrors = [
    {
      fieldName: 'input#upload-method.govuk-radios__input',
      expectedErrorMessage: 'Select how you want to provide your data'
    }
  ]
  await uploadMethodPOM.expectErrorMessages(expectedErrors)
})

test('when the user clicks continue on the file upload page without selecting a file, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const uploadMethodPOM = new UploadMethodPOM(page)
  const uploadFilePOM = new UploadFilePOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Conservation_area_dataset)
  await datasetPOM.clickContinue()

  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.File)
  await uploadMethodPOM.clickContinue()

  await uploadFilePOM.clickContinue()
  const expectedErrors = [
    {
      fieldName: 'input#datafile.govuk-file-upload',
      expectedErrorMessage: 'Select a file'
    }
  ]
  await uploadFilePOM.expectErrorMessages(expectedErrors)
})

test('when the user clicks continue on the url page without entering a url, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPOM = new StartPOM(page)
  const datasetPOM = new DatasetPOM(page)
  const uploadMethodPOM = new UploadMethodPOM(page)
  const uploadURLPOM = new UploadURLPOM(page)
  const errorsPOM = new ErrorsPOM(page)

  await startPOM.navigateHere()
  await startPOM.clickStartNow()

  await datasetPOM.selectDataset(DatasetPOM.datasets.Conservation_area_dataset)
  await datasetPOM.clickContinue()

  await uploadMethodPOM.selectUploadMethod(UploadMethodPOM.uploadMethods.URL)
  await uploadMethodPOM.clickContinue()

  await uploadURLPOM.clickContinue()

  const expectedErrors = [
    {
      fieldName: 'input#url.govuk-input',
      expectedErrorMessage: 'Enter a URL'
    }
  ]

  await errorsPOM.expectErrorMessages(expectedErrors)
})
