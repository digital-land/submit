import { test } from '@playwright/test'
import StartPage from '../PageObjectModels/startPage'
import DatasetPage, { datasets } from '../PageObjectModels/datasetPage'
import UploadMethodPage, { uploadMethods } from '../PageObjectModels/uploadMethodPage'

test('when the user clicks continue on the geometry-type page without entering a geometry type, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPage = new StartPage(page)
  await startPage.navigateHere()

  const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
  await uploadMethodPage.goBack()

  const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
  await datasetPage.selectDataset(datasets.Tree)

  const geometryTypePage = await datasetPage.clickContinue()
  await geometryTypePage.clickContinue(true)

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
  await startPage.navigateHere()

  const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
  await uploadMethodPage.goBack()

  const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
  await datasetPage.selectDataset(datasets.Conservation_area_dataset)

  const uploadMethodPage2 = await datasetPage.clickContinue()
  await uploadMethodPage2.clickContinue(true)

  const expectedErrors = [
    {
      fieldName: 'input#upload-method.govuk-radios__input',
      expectedErrorMessage: 'Select how you want to provide your data'
    }
  ]
  await uploadMethodPage2.expectErrorMessages(expectedErrors)
})

test('when the user clicks continue on the file upload page without selecting a file, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPage = new StartPage(page)
  await startPage.navigateHere()

  const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
  await uploadMethodPage.goBack()

  const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
  await datasetPage.selectDataset(datasets.Conservation_area_dataset)

  const uploadMethodPage2 = await datasetPage.clickContinue()
  await uploadMethodPage2.selectUploadMethod(uploadMethods.File)

  const uploadFilePage = await uploadMethodPage2.clickContinue()
  await uploadFilePage.clickContinue(true)

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
  await startPage.navigateHere()

  const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
  await uploadMethodPage.goBack()

  const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
  await datasetPage.selectDataset(datasets.Conservation_area_dataset)

  const uploadMethodPage2 = await datasetPage.clickContinue()
  await uploadMethodPage2.selectUploadMethod(uploadMethods.URL)

  const uploadURLPage = await uploadMethodPage2.clickContinue()
  await uploadURLPage.clickContinue(true)

  const expectedErrors = [
    {
      fieldName: 'input#url.govuk-input',
      expectedErrorMessage: 'Enter a URL'
    }
  ]

  await uploadURLPage.expectErrorMessages(expectedErrors)
})
