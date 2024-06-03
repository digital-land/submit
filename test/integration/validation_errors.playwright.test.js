import { test } from '@playwright/test'
import StartPage from '../PageObjectModels/startPage'
import NoErrorsPage from '../PageObjectModels/noErrorsPage'

import { datasets } from '../PageObjectModels/datasetPage'
import { uploadMethods } from '../PageObjectModels/uploadMethodPage'

test('when the user clicks continue on the dataset page without entering a dataset, the page correctly indicates there\'s an error', async ({ page }) => {
  const startPage = new StartPage(page)

  await startPage.navigateHere()
  const datasetPage = await startPage.clickStartNow()

  await datasetPage.clickContinue(true)
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

  await startPage.navigateHere()
  const datasetPage = await startPage.clickStartNow()

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
  const datasetPage = await startPage.clickStartNow()

  await datasetPage.selectDataset(datasets.Conservation_area_dataset)
  const uploadMethodPage = await datasetPage.clickContinue()

  await uploadMethodPage.clickContinue(true)
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

  await startPage.navigateHere()
  const datasetPage = await startPage.clickStartNow()

  await datasetPage.selectDataset(datasets.Conservation_area_dataset)
  const uploadMethodPage = await datasetPage.clickContinue()

  await uploadMethodPage.selectUploadMethod(uploadMethods.File)
  const uploadFilePage = await uploadMethodPage.clickContinue()

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
  const datasetPage = await startPage.clickStartNow()

  await datasetPage.selectDataset(datasets.Conservation_area_dataset)
  const uploadMethodPage = await datasetPage.clickContinue()

  await uploadMethodPage.selectUploadMethod(uploadMethods.URL)
  const uploadURLPage = await uploadMethodPage.clickContinue()

  await uploadURLPage.clickContinue(true)

  const expectedErrors = [
    {
      fieldName: 'input#url.govuk-input',
      expectedErrorMessage: 'Enter a URL'
    }
  ]

  await uploadURLPage.expectErrorMessages(expectedErrors)
})

// ToDo: rewrite this for the new async flow
test('when the user clicks continue on the no errors page, without saying their data looks ok, the page correctly indicates there\'s an error', async ({ page }) => {
  const noErrorsPage = new NoErrorsPage(page)

  await noErrorsPage.navigateToRequest('complete')
  await noErrorsPage.clickContinue(true)

  const expectedErrors = [
    {
      fieldName: 'input#dataLooksCorrect.govuk-radios__input',
      expectedErrorMessage: 'Select if your data looks ok'
    }
  ]
  await noErrorsPage.expectErrorMessages(expectedErrors)
})
