import { test } from '@playwright/test'
import StartPage from '../PageObjectModels/startPage'
import DatasetPage from '../PageObjectModels/datasetPage'
import GeometryTypePage from '../PageObjectModels/geometryTypePage'
import UploadMethodPage from '../PageObjectModels/uploadMethodPage'
import UploadFilePage from '../PageObjectModels/uploadFilePage'
import UploadURLPage from '../PageObjectModels/uploadURLPage'
import ErrorsPage from '../PageObjectModels/errorsPage'
import NoErrorsPage from '../PageObjectModels/noErrorsPage'

test('when the user clicks continue on the dataset page without entering a dataset, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPage = new StartPage(page)
  const datasetPage = new DatasetPage(page)

  await startPage.navigateHere()
  await startPage.clickStartNow()

  await datasetPage.clickContinue()
  const expectedErrors = [
    {
      fieldName: 'input#dataset.govuk-radios__input',
      expectedErrorMessage: 'Select a dataset'
    }
  ]
  await datasetPage.expectErrorMessages(expectedErrors)
})

test('when the user clicks continue on the geometry-type page without entering a geometry type, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPage = new StartPage(page)
  const datasetPage = new DatasetPage(page)
  const geometryTypePage = new GeometryTypePage(page)

  await startPage.navigateHere()
  await startPage.clickStartNow()

  await datasetPage.selectDataset(DatasetPage.datasets.Tree)
  await datasetPage.clickContinue()

  await geometryTypePage.clickContinue()
  const expectedErrors = [
    {
      fieldName: 'input#geomType.govuk-radios__input',
      expectedErrorMessage: 'Select if your geometry data given as points or polygons'
    }
  ]
  await geometryTypePage.expectErrorMessages(expectedErrors)
})

test('when the user clicks continue on the how do you want to provide your data page without selecting a method, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPage = new StartPage(page)
  const datasetPage = new DatasetPage(page)
  const uploadMethodPage = new UploadMethodPage(page)

  await startPage.navigateHere()
  await startPage.clickStartNow()

  await datasetPage.selectDataset(DatasetPage.datasets.Conservation_area_dataset)
  await datasetPage.clickContinue()

  await uploadMethodPage.clickContinue()
  const expectedErrors = [
    {
      fieldName: 'input#upload-method.govuk-radios__input',
      expectedErrorMessage: 'Select how you want to provide your data'
    }
  ]
  await uploadMethodPage.expectErrorMessages(expectedErrors)
})

test('when the user clicks continue on the file upload page without selecting a file, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPage = new StartPage(page)
  const datasetPage = new DatasetPage(page)
  const uploadMethodPage = new UploadMethodPage(page)
  const uploadFilePage = new UploadFilePage(page)

  await startPage.navigateHere()
  await startPage.clickStartNow()

  await datasetPage.selectDataset(DatasetPage.datasets.Conservation_area_dataset)
  await datasetPage.clickContinue()

  await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.File)
  await uploadMethodPage.clickContinue()

  await uploadFilePage.clickContinue()
  const expectedErrors = [
    {
      fieldName: 'input#datafile.govuk-file-upload',
      expectedErrorMessage: 'Select a file'
    }
  ]
  await uploadFilePage.expectErrorMessages(expectedErrors)
})

test('when the user clicks continue on the url page without entering a url, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPage = new StartPage(page)
  const datasetPage = new DatasetPage(page)
  const uploadMethodPage = new UploadMethodPage(page)
  const uploadURLPage = new UploadURLPage(page)
  const errorsPage = new ErrorsPage(page)

  await startPage.navigateHere()
  await startPage.clickStartNow()

  await datasetPage.selectDataset(DatasetPage.datasets.Conservation_area_dataset)
  await datasetPage.clickContinue()

  await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.URL)
  await uploadMethodPage.clickContinue()

  await uploadURLPage.clickContinue()

  const expectedErrors = [
    {
      fieldName: 'input#url.govuk-input',
      expectedErrorMessage: 'Enter a URL'
    }
  ]

  await errorsPage.expectErrorMessages(expectedErrors)
})

// ToDo: rewrite this for the new async flow
test('when the user clicks continue on the no errors page, without saying their data looks ok, the page correctly indicates there\'s an error', async ({ page }) => {
  const noErrorsPage = new NoErrorsPage(page)

  await noErrorsPage.navigateToResult('complete')
  await noErrorsPage.clickContinue()

  const expectedErrors = [
    {
      fieldName: 'input#dataLooksCorrect.govuk-radios__input',
      expectedErrorMessage: 'Select if your data looks ok'
    }
  ]
  await noErrorsPage.expectErrorMessages(expectedErrors)
})
