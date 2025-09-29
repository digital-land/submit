import { test, expect } from '@playwright/test'

import StartPage from '../PageObjectModels/startPage'
import StatusPage from '../PageObjectModels/statusPage'
import ResultsPage from '../PageObjectModels/resultsPage'

import DatasetPage, { datasets } from '../PageObjectModels/datasetPage'
import GeometryTypePage, { geometryTypes } from '../PageObjectModels/geometryTypePage'
import UploadMethodPage, { uploadMethods } from '../PageObjectModels/uploadMethodPage'

const checkRouteResponse = async (page, route, statuses) => {
  const response = await page.goto(route)
  if (Array.isArray(statuses)) {
    expect(statuses.includes(response.status())).toBeTruthy()
  } else {
    expect(response.status()).toBe(statuses)
  }
}

const checkSessionExpired = async (page, route) => {
  await page.goto(route)
  const sessionExpiredText = await page.getByText('Session expired')
  await expect(sessionExpiredText !== undefined).toBeTruthy()
}

test.describe('without a valid session, the user can not access the later form pages', () => {
  test('/check/dataset', async ({ page }) => {
    await checkSessionExpired(page, '/check/dataset')
  })

  test('/check/geometry-type', async ({ page }) => {
    await checkSessionExpired(page, '/check/geometry-type')
  })

  test('/check/upload-method', async ({ page }) => {
    await checkSessionExpired(page, '/check/upload-method')
  })

  test('/check/upload', async ({ page }) => {
    await checkSessionExpired(page, '/check/upload')
  })

  test('/check/url', async ({ page }) => {
    await checkSessionExpired(page, '/check/url')
  })
})

test.describe('with a valid session, the user can access the later form pages', () => {
  test('/check', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()
    await startPage.verifyAndReturnPage(GeometryTypePage)

    await checkRouteResponse(page, '/check/geometry-type', [200, 304])
  })

  test('/check/geometry-type', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const serviceStartGeometryTypePage = await startPage.verifyAndReturnPage(GeometryTypePage)
    await serviceStartGeometryTypePage.waitForPage()
    await serviceStartGeometryTypePage.selectGeometryType(geometryTypes.polygon)
    await serviceStartGeometryTypePage.clickContinue()

    const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await uploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Tree)
    await datasetPage.clickContinue()

    await checkRouteResponse(page, '/check/geometry-type', [200, 304])
  })

  test('/check/upload-method', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const serviceStartGeometryTypePage = await startPage.verifyAndReturnPage(GeometryTypePage)
    await serviceStartGeometryTypePage.waitForPage()
    await serviceStartGeometryTypePage.selectGeometryType(geometryTypes.polygon)
    await serviceStartGeometryTypePage.clickContinue()

    const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await uploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Tree)
    const geometryTypePage = await datasetPage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.selectGeometryType(geometryTypes.point)
    await geometryTypePage.clickContinue()

    await checkRouteResponse(page, '/check/upload-method', [200, 304])
  })

  test('/check/upload', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const serviceStartGeometryTypePage = await startPage.verifyAndReturnPage(GeometryTypePage)
    await serviceStartGeometryTypePage.waitForPage()
    await serviceStartGeometryTypePage.selectGeometryType(geometryTypes.polygon)
    await serviceStartGeometryTypePage.clickContinue()

    const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await uploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Tree)
    const geometryTypePage = await datasetPage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.selectGeometryType(geometryTypes.point)
    const uploadMethodPage2 = await geometryTypePage.clickContinue()

    await uploadMethodPage2.waitForPage()
    await uploadMethodPage2.selectUploadMethod(uploadMethods.File)
    await uploadMethodPage2.clickContinue()

    await checkRouteResponse(page, '/check/upload', [200, 304])
  })

  test('/check/url', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const serviceStartGeometryTypePage = await startPage.verifyAndReturnPage(GeometryTypePage)
    await serviceStartGeometryTypePage.waitForPage()
    await serviceStartGeometryTypePage.selectGeometryType(geometryTypes.polygon)
    await serviceStartGeometryTypePage.clickContinue()

    const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await uploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Tree)

    const geometryTypePage = await datasetPage.clickContinue()
    await geometryTypePage.waitForPage()
    await geometryTypePage.selectGeometryType(geometryTypes.point)

    const uploadMethodPage2 = await geometryTypePage.clickContinue()
    await uploadMethodPage2.waitForPage()
    await uploadMethodPage2.selectUploadMethod(uploadMethods.URL)
    await uploadMethodPage2.clickContinue()

    await checkRouteResponse(page, '/check/url', [200, 304])
  })
})

// ToDo: Complete these tests
test.describe('status and results', () => {
  test('with an existing request id that is still processing when visiting the status page the user remains on the status page', async ({ page }) => {
    const statusPage = new StatusPage(page)
    await statusPage.navigateToRequest('processing')
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(page.url()).toContain('/check/status/processing')
  })

  // ToDo: potential improvement for the future?
  // test('with an existing request id that has completed when visiting the status page the user is redirected to the results page', ({ page }) => {

  // })

  test('with an existing request id that is processing, when visiting the results page the user is redirected to the status page', async ({ page }) => {
    const resultsPage = new ResultsPage(page)
    await resultsPage.navigateToRequest('processing')
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(page.url()).toContain('/check/status/processing')
  })

  test('with an existing request id that has completed when visiting the results page the user remains on the results page', async ({ page }) => {
    const resultsPage = new ResultsPage(page)
    await resultsPage.navigateToRequest('completed')
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(page.url()).toContain('/check/results/completed/1')
  })

  // ToDo: just waiting on Alex's 404 page
  test.skip('with a non existing request id when visiting the status page the user is redirected to the 404 page', () => {

  })

  // ToDo: just waiting on Alex's 404 page
  test.skip('with a non existing request id when visiting the results page the user is redirected to the 404 page', () => {

  })
})

// the accessibility page loads ok
test('/accessibility loads ok', async ({ page }) => {
  await checkRouteResponse(page, '/accessibility', 200)
})
